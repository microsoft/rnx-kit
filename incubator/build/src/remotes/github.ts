import { createOAuthDeviceAuth } from "@octokit/auth-oauth-device";
import { Octokit } from "@octokit/core";
import type { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { RequestError } from "@octokit/request-error";
import { idle, once, withRetry } from "@rnx-kit/tools-shell/async";
import parseGitURL from "git-url-parse";
import fetch from "node-fetch";
import * as fs from "node:fs";
import * as path from "node:path";
import * as readline from "node:readline";
import type { Ora } from "ora";
import {
  BUILD_ID,
  MAX_ATTEMPTS,
  MAX_DOWNLOAD_ATTEMPTS,
  USER_CONFIG_FILE,
  WORKFLOW_ID,
} from "../constants.js";
import { ensureDir } from "../filesystem.js";
import { getRemoteUrl, getRepositoryRoot, stage } from "../git.js";
import { elapsedTime } from "../time.js";
import type {
  BuildParams,
  Context,
  RepositoryInfo,
  UserConfig,
} from "../types.js";

type WorkflowRunId =
  RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["parameters"];
type WorkflowRunsParams =
  RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["parameters"];

const POLL_INTERVAL = 1000;

const workflowRunCache: Record<string, number> = {};

function createOctokitClient(auth?: unknown) {
  if (!auth || typeof auth !== "string") {
    throw new Error(`A GitHub access token is required`);
  }

  const RestClient = Octokit.plugin(restEndpointMethods);
  return new RestClient({
    auth,
    // Use `node-fetch` only if Node doesn't implement Fetch API:
    // https://github.com/octokit/request.js/blob/v8.1.1/src/fetch-wrapper.ts#L28-L31
    request: "fetch" in globalThis ? undefined : { fetch },
  });
}

let octokit = once(createOctokitClient);

async function downloadArtifact(
  runId: WorkflowRunId,
  { platform, projectRoot }: BuildParams
): Promise<string> {
  const listParams = { ...runId };
  const artifacts = await withRetry(async () => {
    const { data, headers } =
      await octokit().rest.actions.listWorkflowRunArtifacts(listParams);
    if (data.artifacts.length === 0) {
      listParams.headers = { "if-none-match": headers.etag };
      throw new Error("No artifacts were uploaded");
    }
    return data.artifacts;
  }, MAX_DOWNLOAD_ATTEMPTS);

  const data = await withRetry(async () => {
    const { data } = await octokit().rest.actions.downloadArtifact({
      owner: runId.owner,
      repo: runId.repo,
      artifact_id: artifacts[0].id,
      archive_format: "zip",
    });
    return data as ArrayBuffer;
  }, MAX_DOWNLOAD_ATTEMPTS);

  const buildDir = path.join(
    getRepositoryRoot(),
    projectRoot,
    platform,
    BUILD_ID
  );
  const filename = path.join(buildDir, artifacts[0].name + ".zip");

  ensureDir(buildDir);
  fs.writeFileSync(filename, Buffer.from(data));
  return filename;
}

async function getPersonalAccessToken(
  logger: Ora,
  forceRefresh?: "force-refresh"
): Promise<string> {
  const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
  if (GITHUB_TOKEN) {
    return GITHUB_TOKEN;
  }

  const config: UserConfig = (() => {
    if (fs.existsSync(USER_CONFIG_FILE)) {
      const content = fs.readFileSync(USER_CONFIG_FILE, { encoding: "utf-8" });
      return JSON.parse(content);
    }
    return {};
  })();
  const githubToken = config.github?.token;
  if (forceRefresh !== "force-refresh" && githubToken) {
    return githubToken;
  }

  const auth = createOAuthDeviceAuth({
    clientType: "oauth-app",
    clientId: "Ov23litJ0KvI5TF8gZiE", // TODO: Register app under an org
    scopes: ["repo"],
    onVerification: (verification) => {
      logger.info(
        "@rnx-kit/build requires your permission to dispatch builds on GitHub"
      );
      logger.info(
        `Open '${verification.verification_uri}' and enter code: ${verification.user_code}`
      );
    },
  });

  const { token } = await auth({ type: "oauth" });
  if (config.github) {
    config.github.token = token;
  } else {
    config.github = { token };
  }
  fs.writeFile(
    USER_CONFIG_FILE,
    JSON.stringify(config, undefined, 2) + "\n",
    () => 0
  );
  return token;
}

async function getWorkflowRunId(
  params: WorkflowRunsParams
): Promise<WorkflowRunId> {
  const listParams = { ...params };
  const run_id = await withRetry(async () => {
    const { data, headers } =
      await octokit().rest.actions.listWorkflowRuns(listParams);
    if (data.workflow_runs.length === 0) {
      listParams.headers = { "if-none-match": headers.etag };
      throw new Error("Failed to get workflow run id");
    }

    return data.workflow_runs[0].id;
  }, MAX_ATTEMPTS);

  return {
    owner: params.owner,
    repo: params.repo,
    run_id,
  };
}

async function watchWorkflowRun(
  runId: WorkflowRunId,
  logger: Ora
): Promise<string | null> {
  logger.start("Starting build");

  const max = Math.max;
  const now = Date.now;

  const params = { ...runId };
  let count = 0;
  let currentStep: string | undefined = "";
  let jobStartedAt = "";
  let idleTime = POLL_INTERVAL;

  while (runId) {
    await idle(idleTime);

    const start = now();

    // Note that GitHub currently limits user-to-server requests to 5000 per
    // hour. That's only ~1.3 requests per second. Besides reducing the poll
    // frequency, we can also use conditional requests to reduce the number of
    // requests that count against the limit.
    //
    // For more details, see
    //   - https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting
    //   - https://docs.github.com/en/rest/overview/resources-in-the-rest-api#conditional-requests
    if (count++ % 5 === 0) {
      try {
        const gh = octokit();
        const result = await gh.rest.actions.listJobsForWorkflowRun(params);
        const activeJobs = result.data.jobs.filter(
          (job) => job && job.conclusion !== "skipped"
        );

        // There must be at least one job that wasn't skipped (for the target
        // platform). If none, we're still waiting for it to start up.
        if (activeJobs.length === 0) {
          continue;
        }

        const job = activeJobs.find((job) => job.status !== "completed");
        if (job) {
          const { started_at, steps } = job;
          currentStep = steps?.find(
            (step) => step.status !== "completed"
          )?.name;
          jobStartedAt = started_at;
          params.headers = { "if-none-match": result.headers.etag };
        } else {
          return activeJobs.reduce((result, job) => {
            const { completed_at, conclusion, name, started_at } = job;
            const elapsed = elapsedTime(started_at, completed_at);
            switch (conclusion) {
              case "failure":
                logger.fail(`${name} failed (${elapsed})`);
                break;
              case "success":
                logger.succeed(`${name} succeeded (${elapsed})`);
                break;
              default:
                logger.fail(`${name} ${conclusion} (${elapsed})`);
                break;
            }
            return conclusion || result;
          }, "failure");
        }
      } catch (e) {
        if (e instanceof RequestError && e.status === 304) {
          // Status is unchanged since last request
        } else {
          throw e;
        }
      }
    }

    if (!currentStep) {
      continue;
    }

    logger.text = `${currentStep} (${elapsedTime(jobStartedAt)})`;
    idleTime = max(100, POLL_INTERVAL - (now() - start));
  }

  return null;
}

/**
 * Returns name and owner of repository if upstream is GitHub.
 * @param upstream Upstream (tracking) reference; defaults to "origin"
 * @returns Name and owner of repository if upstream is GitHub; otherwise `undefined`
 */
export function getRepositoryInfo(
  upstream = "origin",
  remoteUrl = getRemoteUrl(upstream)
): RepositoryInfo | undefined {
  const gitUrl = parseGitURL(remoteUrl);
  if (gitUrl.source !== "github.com") {
    return undefined;
  }

  const { owner, name: repo } = gitUrl;
  return { owner, repo };
}

export async function install(): Promise<number> {
  const workflowFile = path.join(
    getRepositoryRoot(),
    ".github",
    "workflows",
    WORKFLOW_ID
  );
  if (!fs.existsSync(workflowFile)) {
    const prompt = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    await new Promise((resolve) => {
      prompt.question(
        `A workflow file needs to be checked in first before you can start using ${BUILD_ID}.\n\n${BUILD_ID} will now copy the file to your repository. Please check it into your main branch.\n\nPress any key to continue`,
        resolve
      );
    });
    prompt.close();

    ensureDir(path.dirname(workflowFile));
    fs.copyFileSync(
      path.join(__dirname, "..", "..", "workflows", "github.yml"),
      workflowFile
    );
    stage(workflowFile);
    return 1;
  }

  return 0;
}

export async function build(
  { owner, repo, ref }: Context,
  inputs: BuildParams,
  logger: Ora
): Promise<string | null> {
  const dispatchParams = {
    owner,
    repo,
    workflow_id: WORKFLOW_ID,
    ref,
    inputs,
  };
  try {
    const token = await getPersonalAccessToken(logger);
    await octokit(token).rest.actions.createWorkflowDispatch(dispatchParams);
  } catch (e) {
    if (e instanceof RequestError && e.status === 401) {
      logger.info("Access token has expired");

      // Reset to force the creation of a new Octokit client
      octokit = once(createOctokitClient);

      const token = await getPersonalAccessToken(logger, "force-refresh");
      await octokit(token).rest.actions.createWorkflowDispatch(dispatchParams);
    } else {
      throw e;
    }
  }

  const workflowRunId = await getWorkflowRunId({
    owner,
    repo,
    workflow_id: WORKFLOW_ID,
    branch: ref,
    event: "workflow_dispatch",
    per_page: 1,
    exclude_pull_requests: true,
  });
  workflowRunCache[ref] = workflowRunId.run_id;

  logger.succeed(
    `Build queued: https://github.com/${owner}/${repo}/actions/runs/${workflowRunId.run_id}`
  );

  const conclusion = await watchWorkflowRun(workflowRunId, logger);
  delete workflowRunCache[ref];
  if (conclusion !== "success") {
    return null;
  }

  if (inputs.distribution !== "local") {
    return inputs.distribution;
  }

  logger.start("Downloading build artifact");
  const artifactFile = await downloadArtifact(workflowRunId, inputs);
  logger.succeed(`Build artifact saved to ${artifactFile}`);

  return artifactFile;
}

export async function cancelBuild({
  owner,
  repo,
  ref,
}: Context): Promise<void> {
  const run_id = workflowRunCache[ref];
  if (!run_id) {
    return;
  }

  await octokit().rest.actions.cancelWorkflowRun({ owner, repo, run_id });
}

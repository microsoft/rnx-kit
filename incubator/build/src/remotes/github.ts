import { Octokit } from "@octokit/core";
import type { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import { RequestError } from "@octokit/request-error";
import {
  existsSync as fileExists,
  readFileSync as fileReadSync,
} from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as readline from "node:readline";
import ora from "ora";
import { idle, once, withRetry } from "../async";
import {
  BUILD_ID,
  MAX_ATTEMPTS,
  MAX_DOWNLOAD_ATTEMPTS,
  USER_CONFIG_FILE,
  WORKFLOW_ID,
} from "../constants";
import { ensureDir } from "../filesystem";
import { getRemoteUrl, getRepositoryRoot, stage } from "../git";
import { elapsedTime } from "../time";
import type {
  BuildParams,
  Context,
  RepositoryInfo,
  UserConfig,
} from "../types";

type WorkflowRunId =
  RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["parameters"];
type WorkflowRunsParams =
  RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["parameters"];

const POLL_INTERVAL = 1000;

const workflowRunCache: Record<string, number> = {};

const octokit = once(() => {
  const RestClient = Octokit.plugin(restEndpointMethods);
  return new RestClient({ auth: getPersonalAccessToken() });
});

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

  await ensureDir(buildDir);
  await fs.writeFile(filename, Buffer.from(data));
  return filename;
}

function getPersonalAccessToken(): string | undefined {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }

  if (!fileExists(USER_CONFIG_FILE)) {
    return undefined;
  }

  const content = fileReadSync(USER_CONFIG_FILE, { encoding: "utf-8" });
  const config: UserConfig = JSON.parse(content);
  return config?.github?.token;
}

async function getWorkflowRunId(
  params: WorkflowRunsParams
): Promise<WorkflowRunId> {
  const listParams = { ...params };
  const run_id = await withRetry(async () => {
    const { data, headers } = await octokit().rest.actions.listWorkflowRuns(
      listParams
    );
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
  spinner: ora.Ora
): Promise<string | null> {
  spinner.start("Starting build");

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
        const result = await octokit().rest.actions.listJobsForWorkflowRun(
          params
        );
        const activeJobs = result.data.jobs.filter(
          (job) => job && job.conclusion !== "skipped"
        );

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
                spinner.fail(`${name} failed (${elapsed})`);
                break;
              case "success":
                spinner.succeed(`${name} succeeded (${elapsed})`);
                break;
              default:
                spinner.fail(`${name} ${conclusion} (${elapsed})`);
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

    spinner.text = `${currentStep} (${elapsedTime(jobStartedAt)})`;
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
  upstream = "origin"
): RepositoryInfo | undefined {
  const remoteUrl = getRemoteUrl(upstream).split(/[/:]/).slice(-3);
  if (remoteUrl.length !== 3 || !remoteUrl[0].endsWith("github.com")) {
    return undefined;
  }

  const repo = remoteUrl[2];
  return {
    owner: remoteUrl[1],
    repo: repo.endsWith(".git") ? repo.substring(0, repo.length - 4) : repo,
  };
}

export async function install(): Promise<number> {
  const workflowFile = path.join(
    getRepositoryRoot(),
    ".github",
    "workflows",
    WORKFLOW_ID
  );
  if (!fileExists(workflowFile)) {
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

    await ensureDir(path.dirname(workflowFile));
    await fs.cp(
      path.join(__dirname, "..", "..", "workflows", "github.yml"),
      workflowFile
    );
    stage(workflowFile);
    return 1;
  }

  if (!getPersonalAccessToken()) {
    const exampleConfig: UserConfig = {
      github: { token: "ghp_0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ" },
    };
    const example = JSON.stringify(exampleConfig);
    console.error(
      `Missing personal access token for GitHub.\n\nPlease create one, and save it in '${USER_CONFIG_FILE}' like below:\n\n\t${example}\n\nFor how to create a personal access token, see: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token`
    );
    return 1;
  }

  return 0;
}

export async function build(
  { owner, repo, ref }: Context,
  inputs: BuildParams,
  spinner: ora.Ora
): Promise<string | null> {
  await octokit().rest.actions.createWorkflowDispatch({
    owner,
    repo,
    workflow_id: WORKFLOW_ID,
    ref,
    inputs,
  });

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

  spinner.succeed(
    `Build queued: https://github.com/${owner}/${repo}/actions/runs/${workflowRunId.run_id}`
  );

  const conclusion = await watchWorkflowRun(workflowRunId, spinner);
  delete workflowRunCache[ref];
  if (conclusion !== "success") {
    return null;
  }

  if (inputs.distribution !== "local") {
    return inputs.distribution;
  }

  spinner.start("Downloading build artifact");
  const artifactFile = await downloadArtifact(workflowRunId, inputs);
  spinner.succeed(`Build artifact saved to ${artifactFile}`);

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

import { Octokit } from "@octokit/core";
import type { RestEndpointMethodTypes } from "@octokit/plugin-rest-endpoint-methods";
import { restEndpointMethods } from "@octokit/plugin-rest-endpoint-methods";
import {
  existsSync as fileExists,
  readFileSync as fileReadSync,
} from "node:fs";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import * as readline from "node:readline";
import ora from "ora";
import { idle, withRetries } from "../async";
import {
  BUILD_ID,
  MAX_ATTEMPTS,
  MAX_DOWNLOAD_ATTEMPTS,
  USER_CONFIG_FILE,
  WORKFLOW_ID,
} from "../constants";
import { getRemoteUrl, getRepositoryRoot, stage } from "../git";
import type {
  BuildParams,
  Context,
  RepositoryInfo,
  UserConfig,
} from "../types";

type GitHubClient = Octokit & ReturnType<typeof restEndpointMethods>;
type WorkflowRunId =
  RestEndpointMethodTypes["actions"]["listJobsForWorkflowRun"]["parameters"];
type WorkflowRunsParams =
  RestEndpointMethodTypes["actions"]["listWorkflowRuns"]["parameters"];

const workflowRunCache: Record<string, number> = {};

const octokit: () => GitHubClient = (() => {
  let client: GitHubClient | undefined = undefined;
  return () => {
    if (!client) {
      const RestClient = Octokit.plugin(restEndpointMethods);
      client = new RestClient({ auth: getPersonalAccessToken() });
    }
    return client;
  };
})();

function ensureDir(dir: string): Promise<string | undefined> {
  return fs.mkdir(dir, { recursive: true, mode: 0o755 });
}

async function downloadArtifact(
  runId: WorkflowRunId,
  { platform, projectRoot }: BuildParams
): Promise<string> {
  const artifacts = await withRetries(async () => {
    const { data } = await octokit().rest.actions.listWorkflowRunArtifacts(
      runId
    );
    if (data.total_count === 0) {
      throw new Error("No artifacts were uploaded");
    }
    return data.artifacts;
  }, MAX_DOWNLOAD_ATTEMPTS);

  const data = await withRetries(async () => {
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
  const config: Partial<UserConfig> = JSON.parse(content);
  return config?.tokens?.github;
}

async function getWorkflowRunId(
  params: WorkflowRunsParams
): Promise<WorkflowRunId> {
  const run_id = await withRetries(async () => {
    const result = await octokit().rest.actions.listWorkflowRuns(params);
    if (result.data.total_count === 0) {
      throw new Error("Failed to get workflow run id");
    }

    return result.data.workflow_runs[0].id;
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

  while (runId) {
    await idle(1000);

    const result = await octokit().rest.actions.listJobsForWorkflowRun(runId);
    const job = result.data.jobs.find((job) => job.conclusion !== "skipped");
    if (!job) {
      continue;
    }

    const { status, conclusion, steps } = job;

    if (status === "completed") {
      switch (conclusion) {
        case "failure":
          spinner.fail("Build failed");
          break;
        case "success":
          spinner.succeed("Build succeeded");
          break;
        default:
          spinner.fail(`Build ${conclusion}`);
          break;
      }
      return conclusion;
    }

    const currentStep = steps?.find((step) => step.status !== "completed");
    if (currentStep) {
      spinner.text = currentStep.name;
    }
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
  const remoteUrl = getRemoteUrl(upstream);
  const m = remoteUrl.match(/github.com[/:](.*?)\/(.*?)\.git/);
  if (!m) {
    return undefined;
  }

  return { owner: m[1], repo: m[2] };
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
      tokens: {
        github: "token",
      },
    };
    const example = JSON.stringify(exampleConfig);
    console.error(
      `Missing personal access token for GitHub. Please create one, and put it in \`${USER_CONFIG_FILE}\`, e.g.: \`${example}\`.`
    );
    console.error(
      "For how to create a personal access token, see: https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/creating-a-personal-access-token"
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

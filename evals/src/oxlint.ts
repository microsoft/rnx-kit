import {
  existingFiles,
  requireConfig,
  result,
  toAgentRun,
} from "@rnx-kit/agent-evals";
import type {
  AgentRun,
  AssertionContext,
  GradingResult,
} from "@rnx-kit/agent-evals";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

/**
 * Configuration for `passesOxlint`.
 */
export type OxlintMatcher = {
  /** Regular expression matched against changed file paths */
  files: string;
  /** Path to an oxlint config, relative to `src/configs` */
  config: string;
};

type OxlintReport = {
  number_of_files: number;
  diagnostics: {
    message: string;
    code: string;
    filename: string;
    labels: { span: { line: number } }[];
  }[];
};

const OXLINT = fileURLToPath(
  new URL("./cli.js", import.meta.resolve("oxlint"))
);
const OXLINT_TIMEOUT_MS = 60 * 1000;

/**
 * Passes if the matching changed files pass oxlint with the configured config.
 * Passes trivially if no files match. Nested configs and ignore files in the
 * checkout are ignored.
 *
 * Note: `spawnSync` blocks the event loop, which stalls other tests that
 * promptfoo runs concurrently. Switch to an async spawn if this becomes a
 * bottleneck; promptfoo accepts assertions that return a promise.
 */
export function passesOxlint(
  output: AgentRun | string,
  context: AssertionContext<OxlintMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { files, config } = requireConfig(context);
  const pattern = new RegExp(files);
  const matching = existingFiles(run)
    .filter((file) => pattern.test(file.path))
    .map((file) => file.path);
  if (matching.length === 0) {
    return result([], "No matching files changed");
  }

  const configPath = fileURLToPath(
    new URL(`configs/${config}`, import.meta.url)
  );
  const { error, status, stdout } = spawnSync(
    process.execPath,
    [
      OXLINT,
      "--config",
      configPath,
      "--no-ignore",
      "--format",
      "json",
      ...matching,
    ],
    { cwd: run.workdir, encoding: "utf-8", timeout: OXLINT_TIMEOUT_MS }
  );
  if (error || (status !== 0 && status !== 1)) {
    throw new Error(
      `oxlint failed: ${error?.message ?? `exit code ${status}`}`
    );
  }

  const { diagnostics, number_of_files } = JSON.parse(stdout) as OxlintReport;
  if (number_of_files !== matching.length) {
    throw new Error(
      `oxlint checked ${number_of_files} of ${matching.length} files`
    );
  }

  const failures = diagnostics.map(({ code, filename, labels, message }) => {
    const line = labels[0]?.span.line;
    return `${filename}${line ? `:${line}` : ""}: ${code}: ${message}`;
  });
  return result(failures, `${matching.join(", ")} passed oxlint`);
}

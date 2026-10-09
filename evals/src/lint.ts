import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseSync } from "oxc-parser";
import {
  addedLines,
  existingFiles,
  requireConfig,
  result,
  toAgentRun,
} from "./common.ts";
import type {
  AgentRun,
  AssertionContext,
  GradingResult,
  OxlintMatcher,
  TypeSpecifierMatcher,
} from "./types.ts";

const OXLINT = fileURLToPath(
  new URL("./cli.js", import.meta.resolve("oxlint"))
);
const OXLINT_TIMEOUT_MS = 60 * 1000;

type OxlintReport = {
  number_of_files: number;
  diagnostics: {
    message: string;
    code: string;
    filename: string;
    labels: { span: { line: number } }[];
  }[];
};

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

  const configPath = fileURLToPath(new URL(`../${config}`, import.meta.url));
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

/**
 * Passes if the matching files do not use inline `type` specifiers in import
 * or export statements, e.g. `import { type A, b }`. Passes trivially if no
 * files match.
 */
export function noInlineTypeSpecifiers(
  output: AgentRun | string,
  context: AssertionContext<TypeSpecifierMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { files, addedLinesOnly } = requireConfig(context);
  const pathPattern = new RegExp(files);
  const added = addedLinesOnly ? addedLines(run.diff) : undefined;

  const failures: string[] = [];
  const checked: string[] = [];
  for (const file of existingFiles(run)) {
    if (!pathPattern.test(file.path)) {
      continue;
    }

    const lines = added?.get(file.path);
    if (added && !lines?.size) {
      continue;
    }

    checked.push(file.path);
    const content = file.content ?? "";
    const { program, errors } = parseSync(file.path, content);
    for (const { message } of errors) {
      failures.push(`${file.path}: ${message}`);
    }

    // Only top-level statements are checked; imports and exports nested in
    // ambient module declarations (`declare module "…" {}`) are not. Lint
    // allows these; `typescript/no-namespace` only rejects named namespaces.
    for (const node of program.body) {
      const specifiers =
        node.type === "ImportDeclaration"
          ? node.specifiers.filter(
              (s) => s.type === "ImportSpecifier" && s.importKind === "type"
            )
          : node.type === "ExportNamedDeclaration"
            ? node.specifiers.filter((s) => s.exportKind === "type")
            : [];
      for (const { start } of specifiers) {
        const line = content.slice(0, start).split("\n").length;
        if (!added || lines?.has(line)) {
          failures.push(
            `${file.path}:${line}: Use a separate \`${node.type === "ImportDeclaration" ? "import" : "export"} type\` statement`
          );
        }
      }
    }
  }

  return result(failures, `Checked ${checked.join(", ") || "(none)"}`);
}

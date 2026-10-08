import { parseChangesetFile } from "@changesets/parse";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { parseSync } from "oxc-parser";
import parseDiff from "parse-diff";
import type {
  AgentChangedFile,
  AgentRun,
  AssertionContext,
  ChangesetMatcher,
  CommandMatcher,
  ContentMatcher,
  FilesMatcher,
  GradingResult,
  OxlintMatcher,
  ToolCallMatcher,
  TypeSpecifierMatcher,
} from "./types.ts";

function result(failures: string[], success: string): GradingResult {
  const pass = failures.length === 0;
  return {
    pass,
    score: pass ? 1 : 0,
    reason: pass ? success : failures.join("\n"),
  };
}

/**
 * Returns the agent run, parsing it first if the provider returned JSON.
 * Throws if the output does not have the shape of an `AgentRun`.
 */
export function toAgentRun(output: AgentRun | string): AgentRun {
  const run = typeof output === "string" ? JSON.parse(output) : output;
  if (!run || typeof run !== "object") {
    throw new Error(`Expected agent run to be an object, got: ${run}`);
  }

  const invalid = [
    ...["commands", "toolCalls", "files"].filter(
      (key) => !Array.isArray(run[key])
    ),
    ...["diff", "finalMessage", "workdir"].filter(
      (key) => typeof run[key] !== "string"
    ),
  ];
  if (invalid.length > 0) {
    throw new Error(`Invalid agent run; check: ${invalid.join(", ")}`);
  }

  return run;
}

/**
 * Returns the line numbers added to each file in a unified diff.
 */
function addedLines(diff: string): Map<string, Set<number>> {
  const result = new Map<string, Set<number>>();
  for (const file of parseDiff(diff)) {
    if (file.to && file.to !== "/dev/null") {
      const lines = new Set<number>();
      for (const chunk of file.chunks) {
        for (const change of chunk.changes) {
          if (change.type === "add") {
            lines.add(change.ln);
          }
        }
      }
      result.set(file.to, lines);
    }
  }
  return result;
}

function requireConfig<T>({ config }: AssertionContext<T>): T {
  if (!config) {
    throw new Error("Missing assertion config");
  }
  return config;
}

function existingFiles({ files }: AgentRun): AgentChangedFile[] {
  return files.filter((file) => file.status !== "deleted");
}

function selectLines(
  file: AgentChangedFile,
  added?: Map<string, Set<number>>
): string {
  const content = file.content ?? "";
  if (!added) {
    return content;
  }

  const lines = added.get(file.path);
  return content
    .split("\n")
    .filter((_, i) => lines?.has(i + 1))
    .join("\n");
}

function commandMatches(run: AgentRun, { pattern, cwd }: CommandMatcher) {
  const command = new RegExp(pattern);
  const dir = cwd ? new RegExp(cwd) : undefined;
  return run.commands.filter(
    (c) => command.test(c.command) && (!dir || dir.test(c.cwd))
  );
}

/**
 * Passes if the agent ran a command matching the configured pattern.
 */
export function ranCommand(
  output: AgentRun | string,
  context: AssertionContext<CommandMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const config = requireConfig(context);
  const matches = commandMatches(run, config);
  return result(
    matches.length > 0 ? [] : [`No command matched /${config.pattern}/`],
    `Ran: ${matches.map((c) => c.command).join("; ")}`
  );
}

/**
 * Passes if the agent did not run any command matching the configured pattern.
 */
export function didNotRunCommand(
  output: AgentRun | string,
  context: AssertionContext<CommandMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const config = requireConfig(context);
  const matches = commandMatches(run, config);
  return result(
    matches.map((c) => `Unexpected command in ${c.cwd}: ${c.command}`),
    `No command matched /${config.pattern}/`
  );
}

/**
 * Passes if the agent did not call any tool matching the configured name and
 * arguments.
 */
export function noToolCall(
  output: AgentRun | string,
  context: AssertionContext<ToolCallMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const config = requireConfig(context);
  const name = new RegExp(config.name);
  const args = config.arguments ? new RegExp(config.arguments) : undefined;
  const calls = run.toolCalls.filter(
    (call) =>
      name.test(call.name) &&
      (!args || args.test(JSON.stringify(call.arguments)))
  );
  return result(
    calls.map(
      (c) => `Unexpected tool call: ${c.name} ${JSON.stringify(c.arguments)}`
    ),
    `No tool call matched /${config.name}/`
  );
}

/**
 * Passes if the changed files satisfy the configured constraints.
 */
export function matchesFiles(
  output: AgentRun | string,
  context: AssertionContext<FilesMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { allowed, forbidden, required, status } = requireConfig(context);
  const files = run.files
    .filter((file) => !status || status.includes(file.status))
    .map((file) => file.path);

  const failures: string[] = [];

  if (allowed) {
    const patterns = allowed.map((p) => new RegExp(p));
    for (const file of files) {
      if (!patterns.some((p) => p.test(file))) {
        failures.push(`File not allowed: ${file}`);
      }
    }
  }

  for (const pattern of forbidden ?? []) {
    const re = new RegExp(pattern);
    for (const file of files) {
      if (re.test(file)) {
        failures.push(`File forbidden by /${pattern}/: ${file}`);
      }
    }
  }

  for (const pattern of required ?? []) {
    const re = new RegExp(pattern);
    if (!files.some((file) => re.test(file))) {
      failures.push(`No file matched /${pattern}/`);
    }
  }

  return result(failures, `Changed files: ${files.join(", ") || "(none)"}`);
}

/**
 * Passes if the content of the matching files satisfies the configured
 * patterns. Fails if no files match.
 */
export function matchesContent(
  output: AgentRun | string,
  context: AssertionContext<ContentMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { files, required, forbidden, addedLinesOnly } = requireConfig(context);
  const pathPattern = new RegExp(files);
  const matching = existingFiles(run).filter((file) =>
    pathPattern.test(file.path)
  );
  if (matching.length === 0) {
    return result([`No changed file matched /${files}/`], "");
  }

  const added = addedLinesOnly ? addedLines(run.diff) : undefined;
  const failures: string[] = [];
  for (const file of matching) {
    const content = selectLines(file, added);
    for (const pattern of required ?? []) {
      if (!new RegExp(pattern, "m").test(content)) {
        failures.push(`${file.path}: missing /${pattern}/`);
      }
    }
    for (const pattern of forbidden ?? []) {
      if (new RegExp(pattern, "m").test(content)) {
        failures.push(`${file.path}: contains /${pattern}/`);
      }
    }
  }

  return result(
    failures,
    `Checked ${matching.map((file) => file.path).join(", ")}`
  );
}

const OXLINT = fileURLToPath(
  new URL("./cli.js", import.meta.resolve("oxlint"))
);
const OXLINT_TIMEOUT_MS = 60 * 1000;

type OxlintReport = {
  diagnostics: {
    message: string;
    code: string;
    filename: string;
    labels: { span: { line: number } }[];
  }[];
};

/**
 * Passes if the matching changed files pass oxlint with the configured config.
 * Passes trivially if no files match. Nested configs in the checkout are
 * ignored.
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
    [OXLINT, "--config", configPath, "--format", "json", ...matching],
    { cwd: run.workdir, encoding: "utf-8", timeout: OXLINT_TIMEOUT_MS }
  );
  if (error || (status !== 0 && status !== 1)) {
    throw new Error(
      `oxlint failed: ${error?.message ?? `exit code ${status}`}`
    );
  }

  const { diagnostics } = JSON.parse(stdout) as OxlintReport;
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

/**
 * Passes if the agent added the configured number of change files, mentioning
 * the configured packages.
 */
export function changesets(
  output: AgentRun | string,
  context: AssertionContext<ChangesetMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { count, packages } = requireConfig(context);
  const added = run.files.filter(
    (file) =>
      file.status === "added" &&
      /^\.changeset\/[^/]+\.md$/.test(file.path) &&
      file.path !== ".changeset/README.md"
  );

  const failures: string[] = [];
  if (added.length !== count) {
    failures.push(
      `Expected ${count} change file(s), found ${added.length}: ${added.map((f) => f.path).join(", ")}`
    );
  }

  const released = new Set<string>();
  for (const file of added) {
    try {
      for (const { name } of parseChangesetFile(file.content ?? "").releases) {
        released.add(name);
      }
    } catch (e) {
      failures.push(`${file.path}: ${(e as Error).message}`);
    }
  }

  for (const pkg of packages ?? []) {
    if (!released.has(pkg)) {
      failures.push(`No change file releases ${pkg}`);
    }
  }

  return result(failures, `Found ${added.length} change file(s)`);
}

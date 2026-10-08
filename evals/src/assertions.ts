import rnxkit from "@rnx-kit/eslint-plugin";
import { Linter } from "eslint";
import tseslint from "typescript-eslint";
import { addedLines } from "./diff.ts";
import type {
  AgentChangedFile,
  AgentRun,
  AssertionContext,
  ChangesetMatcher,
  CommandMatcher,
  ContentMatcher,
  FilesMatcher,
  GradingResult,
  LintMatcher,
  ToolCallMatcher,
} from "./types.ts";

function result(failures: string[], success: string): GradingResult {
  const pass = failures.length === 0;
  return { pass, score: pass ? 1 : 0, reason: pass ? success : failures.join("\n") };
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
  run: AgentRun,
  file: AgentChangedFile,
  addedLinesOnly: boolean | undefined
): string {
  const content = file.content ?? "";
  if (!addedLinesOnly) {
    return content;
  }

  const added = addedLines(run.diff).get(file.path);
  return content
    .split("\n")
    .filter((_, i) => added?.has(i + 1))
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
  run: AgentRun,
  context: AssertionContext<CommandMatcher>
): GradingResult {
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
  run: AgentRun,
  context: AssertionContext<CommandMatcher>
): GradingResult {
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
  run: AgentRun,
  context: AssertionContext<ToolCallMatcher>
): GradingResult {
  const config = requireConfig(context);
  const name = new RegExp(config.name);
  const args = config.arguments ? new RegExp(config.arguments) : undefined;
  const calls = run.toolCalls.filter(
    (call) =>
      name.test(call.name) &&
      (!args || args.test(JSON.stringify(call.arguments)))
  );
  return result(
    calls.map((c) => `Unexpected tool call: ${c.name} ${JSON.stringify(c.arguments)}`),
    `No tool call matched /${config.name}/`
  );
}

/**
 * Passes if the changed files satisfy the configured constraints.
 */
export function matchesFiles(
  run: AgentRun,
  context: AssertionContext<FilesMatcher>
): GradingResult {
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
  run: AgentRun,
  context: AssertionContext<ContentMatcher>
): GradingResult {
  const { files, required, forbidden, addedLinesOnly } = requireConfig(context);
  const pathPattern = new RegExp(files);
  const matching = existingFiles(run).filter((file) =>
    pathPattern.test(file.path)
  );
  if (matching.length === 0) {
    return result([`No changed file matched /${files}/`], "");
  }

  const failures: string[] = [];
  for (const file of matching) {
    const content = selectLines(run, file, addedLinesOnly);
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

/**
 * Passes if the matching files pass the configured ESLint rules. Passes
 * trivially if no files match.
 */
export function passesLint(
  run: AgentRun,
  context: AssertionContext<LintMatcher>
): GradingResult {
  const { files, rules, addedLinesOnly } = requireConfig(context);
  const pathPattern = new RegExp(files);
  const added = addedLinesOnly ? addedLines(run.diff) : undefined;

  const linter = new Linter({ configType: "flat" });
  const config: Linter.Config[] = [
    {
      files: ["**/*"],
      languageOptions: { parser: tseslint.parser as Linter.Parser },
      plugins: { "@rnx-kit": rnxkit },
      rules: rules as Linter.RulesRecord,
    },
  ];

  const failures: string[] = [];
  const checked: string[] = [];
  for (const file of existingFiles(run)) {
    if (!pathPattern.test(file.path)) {
      continue;
    }

    checked.push(file.path);
    const lines = added?.get(file.path);
    const messages = linter.verify(file.content ?? "", config, {
      filename: file.path,
    });
    for (const { line, message, ruleId } of messages) {
      if (!added || lines?.has(line)) {
        failures.push(`${file.path}:${line}: ${message} (${ruleId})`);
      }
    }
  }

  return result(failures, `Linted ${checked.join(", ") || "(none)"}`);
}

/**
 * Passes if the agent added the configured number of change files, mentioning
 * the configured packages.
 */
export function changesets(
  run: AgentRun,
  context: AssertionContext<ChangesetMatcher>
): GradingResult {
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

  for (const pkg of packages ?? []) {
    if (!added.some((file) => file.content?.includes(pkg))) {
      failures.push(`No change file mentions ${pkg}`);
    }
  }

  return result(failures, `Found ${added.length} change file(s)`);
}

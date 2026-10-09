import { parseChangesetFile } from "@changesets/parse";
import { readJSONFileSync } from "@rnx-kit/tools-filesystem";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { parseSync } from "oxc-parser";
import parseDiff from "parse-diff";
import type {
  AgentChangedFile,
  AgentCommand,
  AgentRun,
  AssertionContext,
  ChangesetMatcher,
  CommandMatcher,
  ContentMatcher,
  FilesMatcher,
  GitHubMatcher,
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

/**
 * Reduces the executable to its basename without Windows extensions, e.g.
 * `/usr/bin/git` -> `git` and `C:\bin\yarn.cmd` -> `yarn`.
 */
function withoutExecutablePath(executable: string): string {
  return path.win32.basename(executable).replace(/\.(bat|cmd|exe|ps1)$/i, "");
}

function tryReadJSON(file: string) {
  try {
    return readJSONFileSync(file);
  } catch {
    return undefined;
  }
}

function toRelativePath(workdir: string, p: string): string {
  return path.relative(workdir, p).split(path.sep).join("/") || ".";
}

/**
 * Returns the directories of the workspace packages in the checkout, relative
 * to its root, keyed by package name.
 *
 * Note: `@rnx-kit/tools-workspaces` only finds the workspace of the current
 * working directory and caches the result, so it cannot be used here.
 */
function workspacePackages(workdir: string): Map<string, string> {
  const packages = new Map<string, string>();
  const { workspaces = [] } =
    tryReadJSON(path.join(workdir, "package.json")) ?? {};
  const patterns: string[] = Array.isArray(workspaces)
    ? workspaces
    : (workspaces.packages ?? []);
  const manifests = fs.globSync(
    patterns.map((pattern) => `${pattern}/package.json`),
    { cwd: workdir }
  );
  for (const manifest of manifests) {
    // The agent may have left a manifest in an invalid state
    const name = tryReadJSON(path.join(workdir, manifest))?.name;
    if (name) {
      const dir = path.dirname(path.join(workdir, manifest));
      packages.set(name, toRelativePath(workdir, dir));
    }
  }
  return packages;
}

function lazyWorkspacePackages(workdir: string): () => Map<string, string> {
  let packages: Map<string, string> | undefined;
  return () => (packages ??= workspacePackages(workdir));
}

/**
 * Returns the directory of the workspace package containing the specified
 * file, relative to the root of the checkout, or `.` if it is not in one.
 * Unlike looking for the nearest `package.json`, this skips manifests of
 * test fixtures.
 */
function owningPackageDir(packageDirs: Iterable<string>, file: string): string {
  let owner = ".";
  for (const dir of packageDirs) {
    if (file.startsWith(`${dir}/`) && dir.length > owner.length) {
      owner = dir;
    }
  }
  return owner;
}

type ResolvedCommand = { command: string; cwd: string };

/**
 * Joins the arguments of a command for matching after stripping the executable
 * path. For Yarn, also applies `--cwd <dir>` and `workspace <name>` to the
 * working directory, and drops `run`, e.g. `yarn workspace @rnx-kit/cli run
 * build` in `.` becomes `yarn build` in `packages/cli`.
 */
function resolveCommand(
  workdir: string,
  { argv, cwd }: AgentCommand,
  packages: () => Map<string, string>
): ResolvedCommand {
  const [executable = "", ...args] = argv;
  const name = withoutExecutablePath(executable);
  if (name !== "yarn") {
    return { command: [name, ...args].join(" "), cwd };
  }

  let dir = cwd;
  while (args.length > 0) {
    const [arg, value] = args;
    if (arg === "--cwd" && value) {
      dir = toRelativePath(workdir, path.resolve(workdir, dir, value));
      args.splice(0, 2);
    } else if (arg.startsWith("--cwd=")) {
      const value = arg.slice("--cwd=".length);
      dir = toRelativePath(workdir, path.resolve(workdir, dir, value));
      args.splice(0, 1);
    } else if (arg === "workspace" && value && packages().has(value)) {
      dir = packages().get(value) ?? dir;
      args.splice(0, 2);
    } else {
      break;
    }
  }
  if (args[0] === "run") {
    args.shift();
  }
  return { command: ["yarn", ...args].join(" "), cwd: dir };
}

function commandMatches(
  run: AgentRun,
  { pattern, cwd, inPackage }: CommandMatcher
) {
  const packages = lazyWorkspacePackages(run.workdir);
  const command = new RegExp(pattern);
  const dir = cwd ? new RegExp(cwd) : undefined;
  let packageDirs: Set<string> | undefined;
  const isPackageDir = (dir: string) =>
    (packageDirs ??= new Set(packages().values())).has(dir);
  return run.commands
    .map((c) => resolveCommand(run.workdir, c, packages))
    .filter(
      (c) =>
        command.test(c.command) &&
        (!dir || dir.test(c.cwd)) &&
        (!inPackage || isPackageDir(c.cwd))
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
 * Passes if the agent did not call any tool matching the configured name.
 */
export function noToolCall(
  output: AgentRun | string,
  context: AssertionContext<ToolCallMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const config = requireConfig(context);
  const name = new RegExp(config.name);
  const calls = run.toolCalls.filter((call) => name.test(call.name));
  return result(
    calls.map(
      (c) => `Unexpected tool call: ${c.name} ${JSON.stringify(c.arguments)}`
    ),
    `No tool call matched /${config.name}/`
  );
}

/**
 * Passes if the agent did not modify the configured issues or pull requests.
 */
export function notModifiedOnGitHub(
  output: AgentRun | string,
  context: AssertionContext<GitHubMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { numbers } = requireConfig(context);
  if (
    !run.github ||
    !Array.isArray(run.github.modified) ||
    !run.github.modified.every(Number.isInteger)
  ) {
    throw new Error("Invalid agent run; check: github.modified");
  }

  const { modified } = run.github;
  return result(
    numbers
      .filter((number) => modified.includes(number))
      .map((number) => `Modified #${number}`),
    `Did not modify ${numbers.map((number) => `#${number}`).join(", ")}`
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
  const { allowed, forbidden, required, status, singlePackage } =
    requireConfig(context);
  const files = run.files
    .filter((file) => !status || status.includes(file.status))
    .map((file) => file.path);

  const failures: string[] = [];

  if (singlePackage) {
    const dirs = [...workspacePackages(run.workdir).values()];
    const touched = new Set(
      files
        .map((file) => owningPackageDir(dirs, file))
        .filter((dir) => dir !== ".")
    );
    if (touched.size > 1) {
      failures.push(`Changed multiple packages: ${[...touched].join(", ")}`);
    }
  }

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

const TEST_FILE = /(^|\/)test\/(.+\/)?[^/]+\.test\.[cm]?[jt]sx?$/;
const NODE_TEST_IMPORT = /from ["']node:test["']/;
const NODE_ASSERT_IMPORT = /from ["']node:assert\/strict["']/;
const JEST_API = /\bexpect\(|\bjest\.|@jest\/globals/;
const NODE_API = /from ["']node:(test|assert)/;

/**
 * Passes if every changed test file is written for the test runner of its
 * package: Jest if the package has a `jest` field in `package.json` or a
 * `jest.config.js`, otherwise the Node.js test runner. Fails if no test files
 * changed.
 *
 * Note: This mirrors `useJest()` in `scripts/src/commands/test.js`.
 */
export function usesPackageTestRunner(
  output: AgentRun | string
): GradingResult {
  const run = toAgentRun(output);
  const tests = existingFiles(run).filter((file) => TEST_FILE.test(file.path));
  if (tests.length === 0) {
    return result(["No test files changed"], "");
  }

  const added = addedLines(run.diff);
  const dirs = [...workspacePackages(run.workdir).values()];
  const failures: string[] = [];
  for (const file of tests) {
    const dir = path.join(run.workdir, owningPackageDir(dirs, file.path));
    const manifest = readJSONFileSync(path.join(dir, "package.json"));
    const jest =
      Boolean(manifest.jest) || fs.existsSync(path.join(dir, "jest.config.js"));
    const content = file.content ?? "";
    const newLines = selectLines(file, added);
    if (jest) {
      if (NODE_API.test(newLines)) {
        failures.push(`${file.path}: uses node:test in a Jest package`);
      }
    } else {
      if (
        !NODE_TEST_IMPORT.test(content) ||
        !NODE_ASSERT_IMPORT.test(content)
      ) {
        failures.push(
          `${file.path}: missing imports from node:test and node:assert/strict`
        );
      }
      if (JEST_API.test(newLines)) {
        failures.push(
          `${file.path}: uses Jest in a Node.js test runner package`
        );
      }
    }
  }

  return result(
    failures,
    `Checked ${tests.map((file) => file.path).join(", ")}`
  );
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
  const { files, required, match, forbidden, addedLinesOnly } =
    requireConfig(context);
  const pathPattern = new RegExp(files);
  const matching = existingFiles(run).filter((file) =>
    pathPattern.test(file.path)
  );
  if (matching.length === 0) {
    return result([`No changed file matched /${files}/`], "");
  }

  const added = addedLinesOnly ? addedLines(run.diff) : undefined;
  const failures: string[] = [];
  const contents = matching.map((file) => selectLines(file, added));
  for (const pattern of required ?? []) {
    const re = new RegExp(pattern, "m");
    const missing = matching.filter((_, i) => !re.test(contents[i]));
    if (match === "any") {
      if (missing.length === matching.length) {
        failures.push(`No matching file contains /${pattern}/`);
      }
    } else {
      for (const file of missing) {
        failures.push(`${file.path}: missing /${pattern}/`);
      }
    }
  }
  for (const pattern of forbidden ?? []) {
    const re = new RegExp(pattern, "m");
    for (const [i, file] of matching.entries()) {
      if (re.test(contents[i])) {
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

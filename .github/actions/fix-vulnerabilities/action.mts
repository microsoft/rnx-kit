/**
 * Attempts to fix security vulnerabilities in Yarn projects by bumping
 * dependencies. Vulnerable packages are first re-resolved in the lockfile;
 * remaining advisories are handed to Copilot CLI, first with the age gate
 * (`npmMinimalAgeGate`) enabled, then disabled. Copilot's changes are reverted
 * if they fail verification. Accepted changes are staged, so the working tree
 * must be clean before running.
 *
 * Usage: node action.mts [--no-agent] [--report <file>] [<project>...]
 *
 * Projects can also be separated by `;`, e.g. `".;docsite"`.
 */
import type { IOType } from "node:child_process";
import { spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { parseArgs } from "node:util";

type Advisory = {
  key: string;
  name: string;
  id: string;
  title: string;
  url: string;
  severity: string;
  range: string;
  versions: string[];
};

type AuditEntry = {
  value: string;
  children: {
    ID: string | number;
    Issue: string;
    URL: string;
    Severity: string;
    "Vulnerable Versions": string;
    "Tree Versions"?: string[];
  };
};

type State = {
  initial: Advisory[];
  current: Advisory[];
  commands: string[];
  output: string[];
};

const DEPENDENCY_FIELDS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
] as const;

type Manifest = Record<string, unknown> &
  Partial<Record<(typeof DEPENDENCY_FIELDS)[number], Record<string, string>>>;

// Captures `[prefix, operator, major, minor, patch]`, where prefix is e.g.
// `npm:` or `npm:name@`
const RANGE = /^(.*?)([\^~]?)(\d+)\.(\d+)\.(\d+)(?:-[0-9A-Za-z.-]+)?$/;

const YARN_NPM_MINIMAL_AGE_GATE = "YARN_NPM_MINIMAL_AGE_GATE";

const COPILOT_CLI = "@github/copilot@1.0.105";

// Commands that Copilot is allowed to run; avoid `yarn:*` as it would allow
// arbitrary commands via e.g. `yarn exec` or `yarn dlx`. Copilot only matches
// the first-level subcommand, so allowing e.g. `yarn npm audit` requires
// `yarn npm`, which would also allow `yarn npm publish`.
const COPILOT_SHELL_COMMANDS = [
  "yarn dedupe",
  "yarn install",
  "yarn up",
  "yarn why",
];

const SEVERITIES = ["critical", "high", "moderate", "low", "info"];

// Lockfiles and `yarn config` output can exceed the default of 1 MiB
const SPAWN_MAX_BUFFER = 64 * 1024 * 1024;

const STDIO_INHERIT: IOType[] = ["ignore", "inherit", "inherit"];
const STDIO_PIPE: IOType[] = ["pipe", "pipe", "inherit"];

/**
 * Quotes arguments for `cmd.exe`. Arguments must not contain `"` or `%`.
 */
function quote(arg: string): string {
  return /[\s&()<>^|]/.test(arg) ? `"${arg}"` : arg;
}

function spawn(
  command: string,
  args: string[],
  input?: string,
  stdio = STDIO_PIPE
) {
  const options = {
    encoding: "utf-8",
    input,
    maxBuffer: SPAWN_MAX_BUFFER,
    stdio,
  } as const;

  // On Windows, `npx` and `yarn` are batch files, which can only be run in a
  // shell. Node concatenates arguments without quoting them when `shell` is
  // set, so we need to build the command line ourselves.
  if (process.platform === "win32") {
    const commandLine = [command, ...args].map(quote).join(" ");
    return spawnSync(commandLine, { ...options, shell: true });
  }

  return spawnSync(command, args, options);
}

function run(command: string, ...args: string[]): string {
  const { status, stdout } = spawn(command, args);
  if (status !== 0) {
    const cmd = [command, ...args].join(" ");
    throw new Error(`'${cmd}' failed with exit code ${status}`);
  }

  return stdout;
}

function succeeds(command: string, ...args: string[]): boolean {
  return spawn(command, args, undefined, STDIO_INHERIT).status === 0;
}

function ndjson<T>(output: string): T[] {
  const lines: T[] = [];
  for (const line of output.split("\n")) {
    if (line.startsWith("{")) {
      lines.push(JSON.parse(line) as T);
    }
  }
  return lines;
}

function split(output: string): string[] {
  return output.split("\0").filter(Boolean);
}

function audit(): Advisory[] {
  const args = [
    "npm",
    "audit",
    "--all",
    "--recursive",
    "--json",
    "--no-deprecations",
  ];
  // `yarn npm audit` exits with 1 when vulnerabilities are found
  const { status, stdout } = spawn("yarn", args);
  if (status !== 0 && !stdout.includes("{")) {
    const cmd = ["yarn", ...args].join(" ");
    const output = stdout.trim();
    const message = `'${cmd}' failed with exit code ${status}`;
    throw new Error(output ? `${message}:\n${output}` : message);
  }

  const advisories = ndjson<AuditEntry>(stdout).map(({ value, children }) => ({
    key: `${value}@${children.ID}`,
    name: value,
    id: String(children.ID),
    title: children.Issue.replace(/[|<>]/g, "").replace(/\s+/g, " "),
    url: children.URL,
    severity: children.Severity,
    range: children["Vulnerable Versions"],
    versions: children["Tree Versions"] ?? [],
  }));
  return advisories.sort(
    (a, b) =>
      SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity) ||
      a.name.localeCompare(b.name)
  );
}

function tryAudit(): Advisory[] | undefined {
  try {
    return audit();
  } catch (e) {
    console.error(e);
    return undefined;
  }
}

function count(advisories: Advisory[]): number {
  return advisories.reduce((sum, { versions }) => sum + versions.length, 0);
}

function introduced(initial: Advisory[], after: Advisory[]): Advisory[] {
  const known = new Set(initial.map(({ key }) => key));
  return after.filter(({ key }) => !known.has(key));
}

/**
 * Returns whether changes reduced the number of vulnerable packages without
 * introducing new advisories.
 */
function isImprovement(state: State, next: Advisory[] | undefined): boolean {
  return (
    next !== undefined &&
    introduced(state.initial, next).length === 0 &&
    count(next) < count(state.current)
  );
}

function link({ title, url }: Advisory): string {
  return url ? `[${title}](${url})` : title;
}

function status(before: Advisory, after: Advisory[]): string {
  const versions =
    after.find(({ key }) => key === before.key)?.versions?.length ?? 0;
  if (versions === 0) {
    return "✅ Fixed";
  } else if (versions < before.versions.length) {
    return "⚠️ Partially fixed";
  } else {
    return "❌ Not fixed";
  }
}

function gitRoot(): string {
  return run("git", "rev-parse", "--show-toplevel").trim();
}

function hasChanges(): boolean {
  return (
    !succeeds("git", "diff", "--quiet") ||
    run("git", "ls-files", "--others", "--exclude-standard", ":/").trim() !== ""
  );
}

/**
 * Returns workspace manifests relative to the repository root.
 */
function getManifests(root: string): string[] {
  const workspaces = run("yarn", "workspaces", "list", "--json");
  const manifests: string[] = [];
  for (const { location } of ndjson<{ location: string }>(workspaces)) {
    const manifest = path.resolve(location, "package.json");
    manifests.push(path.relative(root, manifest).replaceAll("\\", "/"));
  }
  return manifests;
}

/**
 * Returns a violation if the range change is not allowed, i.e. if it changes
 * protocol, alias or operator, downgrades, or crosses release lines.
 */
function checkRange(
  name: string,
  from: string,
  to: string
): string | undefined {
  const change = `\`${name}\` was changed from \`${from}\` to \`${to}\``;
  const a = from.match(RANGE);
  const b = to.match(RANGE);
  if (!a || !b || a[1] !== b[1] || a[2] !== b[2]) {
    return `${change}, which is not a supported range change`;
  }

  const aMajor = Number(a[3]);
  const aMinor = Number(a[4]);
  const bMajor = Number(b[3]);
  const bMinor = Number(b[4]);

  if (aMajor !== bMajor || (aMajor === 0 && aMinor !== bMinor)) {
    return `${change}, which crosses release lines`;
  }

  const aPatch = Number(a[5]);
  const bPatch = Number(b[5]);
  if (bMinor < aMinor || (bMinor === aMinor && bPatch < aPatch)) {
    return `${change}, which is a downgrade`;
  }

  return undefined;
}

function checkRecords(
  label: string,
  before: Record<string, string> = {},
  after: Record<string, string> = {}
): string[] {
  const keys = Object.keys(before).sort().join(",");
  if (keys !== Object.keys(after).sort().join(",")) {
    return [`${label}: dependencies were added or removed`];
  }

  const violations: string[] = [];
  for (const [name, from] of Object.entries(before)) {
    if (from !== after[name]) {
      const violation = checkRange(name, from, after[name]);
      if (violation) {
        violations.push(`${label}: ${violation}`);
      }
    }
  }
  return violations;
}

function checkManifest(label: string, before: string, after: string): string[] {
  const a: Manifest = JSON.parse(before);
  const b: Manifest = JSON.parse(after);
  const violations: string[] = [];
  for (const key of new Set(Object.keys(a).concat(Object.keys(b)))) {
    if (
      !(DEPENDENCY_FIELDS as readonly string[]).includes(key) &&
      JSON.stringify(a[key]) !== JSON.stringify(b[key])
    ) {
      violations.push(`${label}: \`${key}\` must not be changed`);
    }
  }

  for (const field of DEPENDENCY_FIELDS) {
    violations.push(...checkRecords(`${label} (${field})`, a[field], b[field]));
  }
  return violations;
}

/**
 * Verifies that unstaged dependency changes stay within the current release
 * lines. Changes are compared against the Git index.
 */
function verify(root: string, manifests: string[]): string[] {
  const project = path.relative(root, process.cwd()).replaceAll("\\", "/");
  const prefix = project ? `${project}/` : "";

  const changed = split(run("git", "-C", root, "diff", "-z", "--name-only"));
  const others = ["ls-files", "-z", "--others", "--exclude-standard"];
  const added = split(run("git", "-C", root, ...others));
  const violations: string[] = [];
  for (const file of changed) {
    if (file === `${prefix}yarn.lock`) {
      continue;
    }

    if (!manifests.includes(file)) {
      violations.push(`${file}: file must not be changed`);
      continue;
    }

    const filename = path.join(root, file);
    if (!fs.existsSync(filename)) {
      violations.push(`${file}: file must not be deleted`);
      continue;
    }

    const before = run("git", "-C", root, "show", `:${file}`);
    const after = fs.readFileSync(filename, { encoding: "utf-8" });
    violations.push(...checkManifest(file, before, after));
  }

  const changeset = new RegExp(`^${prefix}\\.changeset/[^/]+\\.md$`);
  for (const file of added) {
    if (!changeset.test(file)) {
      violations.push(`${file}: file must not be added`);
    }
  }

  return violations;
}

function fixWithLockfile(state: State): void {
  // Re-resolve one package at a time so that a bump that introduces new
  // advisories, or fails, can be reverted without losing the others. Bumps that
  // don't reduce the number of vulnerable versions are also reverted to keep
  // the diff small. Re-resolving all packages at once would be faster, but a
  // single bump that introduces new advisories or fails would cause all of them
  // to be reverted.
  for (const name of new Set(state.current.map(({ name }) => name))) {
    console.log(`Re-resolving '${name}'`);
    const next =
      succeeds("yarn", "up", "-R", name, "--mode", "update-lockfile") &&
      succeeds("yarn", "dedupe", "--mode", "update-lockfile")
        ? tryAudit()
        : undefined;
    if (isImprovement(state, next)) {
      state.commands.push(`- \`yarn up -R ${name}\``);
      state.current = next as Advisory[];
      run("git", "add", "yarn.lock");
    } else {
      run("git", "restore", "yarn.lock");
    }
  }
}

function makePrompt(
  state: State,
  ageGateMinutes: number,
  disabled: boolean
): string {
  const days = Math.floor(ageGateMinutes / 60 / 24);
  const ageGate = disabled
    ? `The minimum package age requirement (\`npmMinimalAgeGate\`) of
${days} days has been disabled for this session. At the end of your response,
list all package versions that you added.`
    : "Do not try to bypass the minimum package age requirement (`npmMinimalAgeGate`).";

  const advisories = state.current.flatMap((x) => [
    `- ${x.name} (${x.id}, ${x.severity}): ${x.title}`,
    `  - Vulnerable versions: ${x.range}`,
    `  - Installed vulnerable versions: ${x.versions.join(", ")}`,
  ]);

  const commands = COPILOT_SHELL_COMMANDS.map((cmd) => `\`${cmd}\``);

  const template = path.join(import.meta.dirname, "prompt.template.md");
  return (
    fs
      .readFileSync(template, { encoding: "utf-8" })
      // Use functions so that `$` patterns (e.g. `$&`) in advisories are not
      // interpreted as special replacement patterns
      .replaceAll("{{commands}}", () => commands.join(", "))
      .replaceAll("{{age-gate}}", () => ageGate)
      .replaceAll("{{advisories}}", () => advisories.join("\n"))
  );
}

function fixWithAgent(
  state: State,
  ageGateMinutes: number,
  disabled: boolean
): void {
  const withAgeGate = disabled ? " (age gate disabled)" : "";

  const { output } = state;
  output.push(`### Copilot${withAgeGate}`, "");

  const root = gitRoot();
  const manifests = getManifests(root);

  console.log(`Asking Copilot to fix remaining advisories${withAgeGate}`);
  const copilot = spawn(
    "npx",
    [
      "--yes",
      COPILOT_CLI,
      // Copilot CLI otherwise runs the latest version it has downloaded
      "--no-auto-update",
      "--silent",
      "--no-ask-user",
      "--disable-builtin-mcps",
      "--add-dir",
      root,
      ...COPILOT_SHELL_COMMANDS.map((cmd) => `--allow-tool=shell(${cmd})`),
      "--allow-tool=write(package.json)",
      "--allow-tool=write(.changeset/*.md)",
    ],
    makePrompt(state, ageGateMinutes, disabled)
  );
  output.push(
    copilot.status === 0
      ? copilot.stdout.trimEnd()
      : `Copilot failed with exit code ${copilot.status}.`,
    ""
  );

  if (!hasChanges()) {
    return;
  }

  console.log("Verifying Copilot's changes");
  let violations: string[] = [];
  let next: Advisory[] | undefined;
  // Also brings the lockfile in sync with any manifest changes
  if (succeeds("yarn", "dedupe", "--mode", "update-lockfile")) {
    violations = verify(root, manifests);
    if (violations.length === 0) {
      next = tryAudit();
    }
  }

  if (isImprovement(state, next)) {
    state.current = next as Advisory[];
    run("git", "add", "--all", ":/");
    return;
  }

  console.log("Reverting Copilot's changes");
  run("git", "restore", ":/");
  run("git", "clean", "-fdq", ":/");
  output.push(
    "Copilot's changes were reverted because they failed verification:",
    ""
  );
  if (violations.length > 0) {
    output.push(...violations.map((violation) => `- ${violation}`));
  } else {
    output.push(
      "- the lockfile could not be updated, the number of vulnerable packages was not reduced, or new advisories were introduced"
    );
  }
  output.push("");
}

function summarize({ initial, current, commands }: State): string[] {
  const lines = [
    "| Package | Severity | Advisory | Versions | Status |",
    "| :------ | :------- | :------- | :------- | :----- |",
  ];
  for (const x of initial) {
    const versions = x.versions.join(", ");
    const result = status(x, current);
    lines.push(
      `| \`${x.name}\` | ${x.severity} | ${link(x)} | ${versions} | ${result} |`
    );
  }
  lines.push("");

  if (commands.length > 0) {
    lines.push("### Lockfile changes", "", ...commands, "");
  }

  return lines;
}

function fixProject(project: string, agent: boolean): string[] {
  const header = [`## \`${project}\``, ""];

  console.log(`Auditing '${project}'`);
  const initial = audit();
  if (initial.length === 0) {
    return header.concat(["No advisories found.", ""]);
  }

  const state: State = { initial, current: initial, commands: [], output: [] };
  fixWithLockfile(state);

  if (agent && state.current.length > 0) {
    const ageGate = Number(
      run("yarn", "config", "get", "npmMinimalAgeGate", "--json")
    );
    fixWithAgent(state, ageGate, false);
    if (state.current.length > 0 && ageGate > 0) {
      process.env[YARN_NPM_MINIMAL_AGE_GATE] = "0";
      try {
        fixWithAgent(state, ageGate, true);
      } finally {
        delete process.env[YARN_NPM_MINIMAL_AGE_GATE];
      }
    }
  }

  // Show the advisory table before Copilot's responses
  return header.concat(summarize(state), state.output);
}

function main(): number {
  const { values, positionals } = parseArgs({
    options: {
      help: { type: "boolean", short: "h" },
      "no-agent": { type: "boolean" },
      report: { type: "string" },
    },
    allowPositionals: true,
  });

  if (values.help) {
    const script = path.basename(import.meta.filename);
    console.log(
      `Usage: node ${script} [--no-agent] [--report <file>] [<project>...]`
    );
    return 0;
  }

  // Untracked files must also be absent since rejected changes are cleaned up
  // with `git clean`
  if (run("git", "status", "--porcelain").trim()) {
    console.error("Commit or stash your changes before running this script");
    return 1;
  }

  const projects = positionals
    .flatMap((p) => p.split(";"))
    .map((p) => p.trim())
    .filter(Boolean);
  if (projects.length === 0) {
    projects.push(".");
  }

  // Prevent install scripts from running in case Copilot omits
  // `--mode update-lockfile`
  process.env["YARN_ENABLE_SCRIPTS"] = "0";

  const cwd = process.cwd();
  const report = ["# Security vulnerability fixes", ""];
  for (const project of projects) {
    process.chdir(path.resolve(cwd, project));
    try {
      report.push(...fixProject(project, !values["no-agent"]));
    } finally {
      process.chdir(cwd);
    }
  }

  const content = report.join("\n");
  if (values.report) {
    fs.writeFileSync(values.report, content);
    console.log(`Report written to '${values.report}'`);
  } else {
    console.log(content);
  }
  return 0;
}

process.exitCode = main();

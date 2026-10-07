import { equal, match, ok } from "node:assert/strict";
import { spawnSync } from "node:child_process";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const fixtures = fileURLToPath(new URL("__fixtures__", import.meta.url));
const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));

function run(args: string[], graderDir?: string) {
  // Child processes of the test runner would otherwise report to it
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  if (graderDir) {
    env.PATH = `${path.join(fixtures, graderDir)}${path.delimiter}${env.PATH}`;
  }

  const start = Date.now();
  const { status, stdout, stderr } = spawnSync(
    process.execPath,
    [cli, ...args],
    { encoding: "utf-8", env, timeout: 20000 }
  );
  return { status, output: stdout + stderr, duration: Date.now() - start };
}

const evals = ["--evals", path.join(fixtures, "rubric-only.ts")];
const log = path.join(fixtures, "events.jsonl");

describe("cli", () => {
  it("fails on unknown `--evals` paths", () => {
    const { status, output } = run(["--evals", "does-not-exist", log]);
    equal(status, 1);
    match(output, /^Unknown evals path: does-not-exist$/m);
  });

  it("fails on invalid `--grader-timeout` values", () => {
    for (const value of ["0", "-1", "soon"]) {
      // `parseArgs` only accepts values starting with `-` after `=`
      const { status, output } = run([
        ...evals,
        `--grader-timeout=${value}`,
        log,
      ]);
      equal(status, 1);
      match(output, /^Usage: agent-evals/m);
    }
  });

  const skip = process.platform === "win32" && "Fake graders are POSIX scripts";

  for (const grader of ["grader-hang", "grader-hang-with-child"]) {
    it(`fails rubrics when the grader times out (${grader})`, { skip }, () => {
      const { status, output, duration } = run(
        [...evals, "--grader-timeout", "1", log],
        grader
      );
      equal(status, 1);
      match(output, /Grader timed out after 1 s/);
      ok(duration < 10000, `Grading took ${duration} ms`);
    });
  }
});

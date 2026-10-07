import { deepEqual, equal, match, ok } from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";

const fixtures = fileURLToPath(new URL("__fixtures__", import.meta.url));
const cli = fileURLToPath(new URL("../src/cli.ts", import.meta.url));
const pkgDir = fileURLToPath(new URL("..", import.meta.url));

function makeEnv(graderDir?: string) {
  // Child processes of the test runner would otherwise report to it
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  if (graderDir) {
    env.PATH = `${path.join(fixtures, graderDir)}${path.delimiter}${env.PATH}`;
  }
  return env;
}

function isRunning(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

async function waitFor(condition: () => boolean, timeout = 10000) {
  const end = Date.now() + timeout;
  while (!condition()) {
    if (Date.now() > end) {
      return false;
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  return true;
}

function run(args: string[], graderDir?: string) {
  const env = makeEnv(graderDir);
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
    it(
      `reports an error when the grader times out (${grader})`,
      { skip },
      () => {
        const { status, output, duration } = run(
          [...evals, "--grader-timeout", "1", log],
          grader
        );
        equal(status, 1);
        match(output, /^# error: .*: Grader timed out after 1 s$/m);
        match(output, /1 of 1 sessions could not be graded/);
        ok(duration < 10000, `Grading took ${duration} ms`);
      }
    );
  }

  it("checks verdicts against labels with `--calibrate`", { skip }, () => {
    // With a grader that always passes, only logs labelled `fail` differ. This
    // also checks that they pass all script checks, so that their rubrics are
    // actually graded.
    const calibration = path.join(pkgDir, "calibration");
    const labelled = fs
      .globSync("*/*/*.jsonl", { cwd: calibration })
      .map((f) => path.join(calibration, f));
    const { status, output } = run(
      ["--evals", path.join(pkgDir, "evals"), "--calibrate", ...labelled],
      "grader-pass"
    );
    equal(status, 1);

    const differ = [...output.matchAll(/Verdicts differ .*?for: ([^']+)/g)]
      .flatMap((m) => m[1].split(", "))
      .sort();
    const expected = labelled
      .filter((f) => path.basename(path.dirname(f)) === "fail")
      .sort();
    ok(expected.length > 0);
    deepEqual(differ, expected);
  });

  for (const [signal, code] of [
    ["SIGINT", 130],
    ["SIGTERM", 143],
  ] as const) {
    it(`kills the grader on ${signal}`, { skip }, async () => {
      const child = spawn(process.execPath, [cli, ...evals, log], {
        env: makeEnv("grader-hang"),
        stdio: "ignore",
      });
      const exited = new Promise<number | null>((resolve) =>
        child.on("exit", resolve)
      );

      // The fake grader `exec`s `sleep`, so it keeps the PID that `pgrep` finds
      let grader = 0;
      const started = await waitFor(() => {
        const { stdout } = spawnSync("pgrep", ["-P", String(child.pid)], {
          encoding: "utf-8",
        });
        grader = Number(stdout.trim().split("\n")[0]);
        return grader > 0;
      });
      if (!started) {
        child.kill("SIGKILL");
      }
      ok(started, "Grader did not start");

      child.kill(signal);
      equal(await exited, code);
      ok(
        await waitFor(() => !isRunning(grader)),
        `Grader ${grader} is still running`
      );
    });
  }
});

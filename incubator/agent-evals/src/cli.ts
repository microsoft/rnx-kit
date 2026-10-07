#!/usr/bin/env node

import { normalizePath } from "@rnx-kit/tools-node";
import { ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { copilot } from "./adapters/copilot.ts";
import { error } from "./assertions.ts";
import { grade } from "./grade.ts";
import { DEFAULT_GRADER_TIMEOUT } from "./rubric.ts";
import type {
  Adapter,
  GradingResult,
  ProviderResponse,
  TestCase,
} from "./types.ts";

const DEFAULT_PASS_RATE = 0.8;

const MAX_CONCURRENT_GRADES = 4;

const EVAL_FILE = /\.eval\.m?ts$/;

const IGNORED_FOLDERS = ["build", "dist", "lib", "node_modules"];

const adapters: Record<string, Adapter> = { copilot };

/**
 * Returns all eval files under the specified paths. A path can be a file or a
 * folder, in which case it is searched recursively. Hidden folders are skipped.
 */
function findEvalFiles(paths: string[]): string[] {
  return paths.flatMap((p) =>
    fs.statSync(p).isDirectory()
      ? fs
          .globSync("**/*.eval.{ts,mts}", {
            cwd: p,
            exclude: (f) => IGNORED_FOLDERS.includes(path.basename(f)),
          })
          .sort()
          .map((f) => path.join(p, f))
      : [p]
  );
}

/**
 * Loads eval files. Each file must default-export a `TestCase` and is named
 * after the file, e.g. `changeset-required.eval.ts` → `changeset-required`.
 */
async function loadEvals(files: string[]): Promise<Map<string, TestCase>> {
  const evals = new Map<string, TestCase>();
  for (const file of files) {
    const name = path.basename(file).replace(EVAL_FILE, "");
    if (evals.has(name)) {
      throw new Error(`Duplicate eval name '${name}': ${file}`);
    }

    const { default: testCase } = await import(
      pathToFileURL(path.resolve(file)).href
    );
    if (!Array.isArray(testCase?.assert)) {
      throw new Error(`${file} does not default-export a test case`);
    }

    evals.set(name, testCase);
  }
  return evals;
}

/**
 * Returns the folders and file name in a log path. Only those below the
 * current folder are returned if the log is inside it, otherwise all of them
 * as specified.
 */
function pathSegments(log: string): string[] {
  const rel = path.relative(process.cwd(), path.resolve(log));
  const isInside =
    rel !== ".." && !/^\.\.[\\/]/.test(rel) && !path.isAbsolute(rel);
  return normalizePath(isInside ? rel : log).split("/");
}

/**
 * Returns whether a log belongs to an eval, i.e. whether a folder in its path
 * is named after the eval. Labelled logs used for calibration always belong to
 * a single eval.
 */
function isSessionFor(
  name: string,
  testCase: TestCase,
  log: string,
  calibrate: boolean
): boolean {
  return (
    (!calibrate && testCase.metadata?.allSessions === true) ||
    pathSegments(log).includes(name)
  );
}

/**
 * Returns the expected verdict of a labelled log, i.e. whether a folder in its
 * path is named `pass` or `fail`.
 */
function expectedVerdict(log: string): boolean | undefined {
  const segments = pathSegments(log).slice(0, -1);
  const label = segments.findLast((s) => s === "pass" || s === "fail");
  return label === undefined ? undefined : label === "pass";
}

/**
 * Returns a function that runs async functions with at most `limit` of them
 * in flight at a time.
 */
function makeLimiter(limit: number) {
  let running = 0;
  const queue: (() => void)[] = [];
  return async <T>(fn: () => Promise<T>): Promise<T> => {
    if (running >= limit) {
      // The slot is handed over by the caller that frees it
      await new Promise<void>((resolve) => queue.push(resolve));
    } else {
      ++running;
    }
    try {
      return await fn();
    } finally {
      const next = queue.shift();
      if (next) {
        next();
      } else {
        --running;
      }
    }
  };
}

function readResponse(logPath: string, adapter: Adapter): ProviderResponse {
  if (fs.statSync(logPath).isDirectory()) {
    logPath = path.join(logPath, "events.jsonl");
  }

  const transcript = adapter(fs.readFileSync(logPath, "utf-8"), logPath);
  const diffPath = logPath.replace(/(\.jsonl)?$/, ".diff");
  const diff = fs.existsSync(diffPath)
    ? fs.readFileSync(diffPath, "utf-8")
    : undefined;

  const last = transcript.entries.findLast(
    (entry) => entry.type === "message" && entry.role === "assistant"
  );
  const output = last?.type === "message" ? last.content : "";

  return { output, metadata: { transcript, diff } };
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    agent: { type: "string", default: "copilot" },
    calibrate: { type: "boolean", default: false },
    evals: { type: "string", multiple: true },
    "grader-model": { type: "string" },
    "grader-timeout": { type: "string" },
    "pass-rate": { type: "string" },
  },
});

const evalsPaths = values.evals ?? ["."];
const missingEvals = evalsPaths.filter((p) => !fs.existsSync(p));
const evals = await loadEvals(
  findEvalFiles(evalsPaths.filter((p) => !missingEvals.includes(p)))
);
const names = positionals.filter((p) => evals.has(p));
const logs = positionals.filter((p) => !evals.has(p));
const adapter = adapters[values.agent];
const missing = logs.filter((log) => !fs.existsSync(log));
const passRate =
  values["pass-rate"] === undefined ? undefined : Number(values["pass-rate"]);
const graderTimeout =
  values["grader-timeout"] === undefined
    ? undefined
    : Number(values["grader-timeout"]);

if (
  evals.size === 0 ||
  !adapter ||
  logs.length === 0 ||
  missing.length > 0 ||
  missingEvals.length > 0 ||
  !(passRate === undefined || (passRate >= 0 && passRate <= 1)) ||
  !(graderTimeout === undefined || graderTimeout > 0)
) {
  for (const p of missingEvals) {
    console.error(`Unknown evals path: ${p}`);
  }
  for (const arg of missing) {
    console.error(`Unknown eval or log: ${arg}`);
  }
  if (missing.length > 0 || missingEvals.length > 0) {
    console.error();
  }
  console.error(
    [
      "Usage: agent-evals [eval...] <log...> [options]",
      "",
      "Grades session logs against evals. Without eval names, all evals are used.",
      "",
      "Evals are `*.eval.ts` and `*.eval.mts` files that default-export a test",
      "case. They are found in the current folder and its subfolders, except",
      `${IGNORED_FOLDERS.join(", ")} and hidden folders.`,
      "",
      "A log is a session log file or folder. If a file with the same name but",
      "with a `.diff` extension exists next to it, it is used as the diff.",
      "",
      "An eval only grades logs with a folder named after it in their path, e.g.",
      "`logs/changeset-required/session.jsonl`, unless it sets",
      "`metadata.allSessions`. Other logs are skipped. Only folders below the",
      "current folder are considered for logs inside it.",
      "",
      "Options:",
      `  --agent <name>          Agent that produced the logs (default: copilot)`,
      "  --calibrate             Check that each log gets the verdict of the",
      "                          `pass` or `fail` folder in its path, instead of",
      "                          checking the pass rate",
      "  --evals <path>          File or folder to find evals in, instead of the",
      "                          current folder; can be specified multiple times",
      "  --grader-model <model>  Model used by Copilot CLI to grade rubrics",
      `  --grader-timeout <s>    Seconds to wait for each rubric grade (default: ${DEFAULT_GRADER_TIMEOUT})`,
      `  --pass-rate <n>         Fraction of logs that must pass, 0-1 (default: ${DEFAULT_PASS_RATE} or the eval's)`,
      "",
      `Evals: ${[...evals.keys()].join(", ") || "(none found)"}`,
      `Agents: ${Object.keys(adapters).join(", ")}`,
    ].join("\n")
  );
  process.exitCode = 1;
} else {
  const graderOptions = {
    model: values["grader-model"],
    timeout: graderTimeout,
  };
  const responses = logs.map((log) => readResponse(log, adapter));

  // Start grading all evals up front so that the concurrency limit is shared
  // across evals; tests below only wait for their results
  const limit = makeLimiter(MAX_CONCURRENT_GRADES);
  for (const name of names.length > 0 ? names : evals.keys()) {
    const testCase = evals.get(name) as TestCase;
    const requiredPassRate =
      passRate ?? testCase.metadata?.passRate ?? DEFAULT_PASS_RATE;
    const indices = logs
      .map((_, i) => i)
      .filter((i) => isSessionFor(name, testCase, logs[i], values.calibrate));
    const pending = indices.map(
      (i): Promise<GradingResult> =>
        limit(() => grade(testCase, responses[i], graderOptions)).catch((e) =>
          error(`Grading failed: ${e}`)
        )
    );

    test(`${name}: ${testCase.description}`, async (t) => {
      for (const [i, log] of logs.entries()) {
        if (!indices.includes(i)) {
          t.diagnostic(`skip: ${log}`);
        }
      }

      const results = await Promise.all(pending);
      for (const [j, { pass, error, reason }] of results.entries()) {
        const verdict = error ? "error" : pass ? "pass" : "fail";
        t.diagnostic(`${verdict}: ${logs[indices[j]]}: ${reason}`);
      }

      if (results.length === 0) {
        t.skip("No sessions for this eval");
        return;
      }

      // Sessions that could not be graded say nothing about the agent, but
      // the eval cannot be trusted either
      const errors = results.filter((result) => result.error).length;
      ok(
        errors === 0,
        `${errors} of ${results.length} sessions could not be graded`
      );

      if (values.calibrate) {
        const mismatches = indices.filter(
          (i, j) => expectedVerdict(logs[i]) !== results[j].pass
        );
        ok(
          mismatches.length === 0,
          `Verdicts differ from the expected ones (pass/fail folder) for: ${mismatches.map((i) => logs[i]).join(", ")}`
        );
        return;
      }

      const passed = results.filter((result) => result.pass).length;
      ok(
        passed / results.length >= requiredPassRate,
        `${passed} of ${results.length} sessions passed; required pass rate: ${requiredPassRate}`
      );
    });
  }
}

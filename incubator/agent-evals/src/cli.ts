#!/usr/bin/env node

import { ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import { pathToFileURL } from "node:url";
import { parseArgs } from "node:util";
import { copilot } from "./adapters/copilot.ts";
import { grade } from "./grade.ts";
import type { Adapter, ProviderResponse, TestCase } from "./types.ts";

const DEFAULT_PASS_RATE = 0.8;

const EVAL_FILE = /\.eval\.m?ts$/;

const IGNORED_FOLDERS = ["build", "dist", "lib", "node_modules"];

const adapters: Record<string, Adapter> = { copilot };

/**
 * Returns all eval files under the specified paths. A path can be a file or a
 * folder, in which case it is searched recursively.
 */
function findEvalFiles(paths: string[]): string[] {
  const files: string[] = [];
  const search = (p: string) => {
    if (!fs.statSync(p).isDirectory()) {
      files.push(p);
      return;
    }

    for (const entry of fs.readdirSync(p, { withFileTypes: true })) {
      const entryPath = path.join(p, entry.name);
      if (entry.isDirectory()) {
        if (
          !IGNORED_FOLDERS.includes(entry.name) &&
          !entry.name.startsWith(".")
        ) {
          search(entryPath);
        }
      } else if (entry.isFile() && EVAL_FILE.test(entry.name)) {
        files.push(entryPath);
      }
    }
  };

  for (const p of paths) {
    search(p);
  }
  return files;
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
 * Returns whether a log belongs to an eval, i.e. whether a folder in its path
 * is named after the eval.
 */
function isSessionFor(name: string, testCase: TestCase, log: string): boolean {
  return (
    testCase.metadata?.allSessions === true ||
    path.resolve(log).split(/[\\/]/).includes(name)
  );
}

function readResponse(logPath: string, adapter: Adapter): ProviderResponse {
  if (fs.statSync(logPath).isDirectory()) {
    logPath = path.join(logPath, "events.jsonl");
  }

  const transcript = adapter(fs.readFileSync(logPath, "utf-8"));
  const diffPath = logPath.replace(/(\.jsonl)?$/, ".diff");
  const diff = fs.existsSync(diffPath)
    ? fs.readFileSync(diffPath, "utf-8")
    : undefined;

  const messages = transcript.entries.filter(
    (entry) => entry.type === "message" && entry.role === "assistant"
  );
  const last = messages[messages.length - 1];
  const output = last?.type === "message" ? last.content : "";

  return { output, metadata: { transcript, diff } };
}

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    agent: { type: "string", default: "copilot" },
    evals: { type: "string", multiple: true },
    "grader-model": { type: "string" },
    "pass-rate": { type: "string" },
  },
});

const evals = await loadEvals(findEvalFiles(values.evals ?? ["."]));
const names = positionals.filter((p) => evals.has(p));
const logs = positionals.filter((p) => !evals.has(p));
const adapter = adapters[values.agent];
const missing = logs.filter((log) => !fs.existsSync(log));
const passRate =
  values["pass-rate"] === undefined ? undefined : Number(values["pass-rate"]);

if (
  evals.size === 0 ||
  !adapter ||
  logs.length === 0 ||
  missing.length > 0 ||
  !(passRate === undefined || (passRate >= 0 && passRate <= 1))
) {
  for (const arg of missing) {
    console.error(`Unknown eval or log: ${arg}`);
  }
  if (missing.length > 0) {
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
      "`metadata.allSessions`. Other logs are skipped.",
      "",
      "Options:",
      `  --agent <name>          Agent that produced the logs (default: copilot)`,
      "  --evals <path>          File or folder to find evals in, instead of the",
      "                          current folder; can be specified multiple times",
      "  --grader-model <model>  Model used by Copilot CLI to grade rubrics",
      `  --pass-rate <n>         Fraction of logs that must pass, 0-1 (default: ${DEFAULT_PASS_RATE} or the eval's)`,
      "",
      `Evals: ${[...evals.keys()].join(", ") || "(none found)"}`,
      `Agents: ${Object.keys(adapters).join(", ")}`,
    ].join("\n")
  );
  process.exitCode = 1;
} else {
  const graderOptions = { model: values["grader-model"] };
  const responses = logs.map((log) => readResponse(log, adapter));
  for (const name of names.length > 0 ? names : evals.keys()) {
    const testCase = evals.get(name) as TestCase;
    const requiredPassRate =
      passRate ?? testCase.metadata?.passRate ?? DEFAULT_PASS_RATE;
    test(`${name}: ${testCase.description}`, async (t) => {
      let passed = 0;
      let graded = 0;
      for (let i = 0; i < logs.length; ++i) {
        if (!isSessionFor(name, testCase, logs[i])) {
          t.diagnostic(`skip: ${logs[i]}`);
          continue;
        }

        ++graded;
        const result = await grade(testCase, responses[i], graderOptions);
        if (result.pass) {
          ++passed;
        }
        t.diagnostic(
          `${result.pass ? "pass" : "fail"}: ${logs[i]}: ${result.reason}`
        );
      }

      if (graded === 0) {
        t.skip("No sessions for this eval");
        return;
      }

      ok(
        passed / graded >= requiredPassRate,
        `${passed} of ${graded} sessions passed; required pass rate: ${requiredPassRate}`
      );
    });
  }
}

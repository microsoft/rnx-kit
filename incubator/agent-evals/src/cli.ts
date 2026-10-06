import { ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import { copilot } from "./adapters/copilot.ts";
import { evals } from "./evals/index.ts";
import { grade } from "./grade.ts";
import type { Adapter, ProviderResponse } from "./types.ts";

const DEFAULT_PASS_RATE = 0.8;

const adapters: Record<string, Adapter> = { copilot };

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

const [name, ...logs] = process.argv.slice(2);
const testCase = evals[name];
const adapter = adapters[process.env["EVALS_AGENT"] || "copilot"];

if (!testCase || !adapter || logs.length === 0) {
  console.error(
    [
      "Usage: yarn evals <eval> <log...>",
      "",
      "A log is a session log file or folder. If a file with the same name but",
      "with a `.diff` extension exists next to it, it is used as the diff.",
      "",
      `Evals: ${Object.keys(evals).join(", ")}`,
      `Agents (EVALS_AGENT): ${Object.keys(adapters).join(", ")}`,
    ].join("\n")
  );
  process.exitCode = 1;
} else {
  test(`${name}: ${testCase.description}`, async (t) => {
    let passed = 0;
    for (const log of logs) {
      const result = await grade(testCase, readResponse(log, adapter));
      if (result.pass) {
        ++passed;
      }
      t.diagnostic(
        `${result.pass ? "pass" : "fail"}: ${log}: ${result.reason}`
      );
    }

    const passRate = testCase.metadata?.passRate ?? DEFAULT_PASS_RATE;
    ok(
      passed / logs.length >= passRate,
      `${passed} of ${logs.length} sessions passed; required pass rate: ${passRate}`
    );
  });
}

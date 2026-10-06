import { ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { test } from "node:test";
import { parseArgs } from "node:util";
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

const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: {
    agent: { type: "string", default: "copilot" },
    "grader-model": { type: "string" },
    "pass-rate": { type: "string" },
  },
});

const [name, ...logs] = positionals;
const testCase = evals[name];
const adapter = adapters[values.agent];
const passRate = Number(
  values["pass-rate"] ?? testCase?.metadata?.passRate ?? DEFAULT_PASS_RATE
);

if (
  !testCase ||
  !adapter ||
  logs.length === 0 ||
  !(passRate >= 0 && passRate <= 1)
) {
  console.error(
    [
      "Usage: yarn evals <eval> <log...> [options]",
      "",
      "A log is a session log file or folder. If a file with the same name but",
      "with a `.diff` extension exists next to it, it is used as the diff.",
      "",
      "Options:",
      `  --agent <name>          Agent that produced the logs (default: copilot)`,
      "  --grader-model <model>  Model used by Copilot CLI to grade rubrics",
      `  --pass-rate <n>         Fraction of logs that must pass, 0-1 (default: ${DEFAULT_PASS_RATE} or the eval's)`,
      "",
      `Evals: ${Object.keys(evals).join(", ")}`,
      `Agents: ${Object.keys(adapters).join(", ")}`,
    ].join("\n")
  );
  process.exitCode = 1;
} else {
  const graderOptions = { model: values["grader-model"] };
  test(`${name}: ${testCase.description}`, async (t) => {
    let passed = 0;
    for (const log of logs) {
      const response = readResponse(log, adapter);
      const result = await grade(testCase, response, graderOptions);
      if (result.pass) {
        ++passed;
      }
      t.diagnostic(
        `${result.pass ? "pass" : "fail"}: ${log}: ${result.reason}`
      );
    }

    ok(
      passed / logs.length >= passRate,
      `${passed} of ${logs.length} sessions passed; required pass rate: ${passRate}`
    );
  });
}

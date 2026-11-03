import * as fs from "node:fs";
import { styleText } from "node:util";

/** promptfoo's `ResultFailureReason.ERROR` */
const FAILURE_REASON_ERROR = 2;

type ComponentResult = {
  pass: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
};

/**
 * Subset of promptfoo's `EvaluateResult` that the report uses.
 */
export type EvalResult = {
  testIdx: number;
  description?: string;
  success: boolean;
  failureReason?: number;
  error?: string;
  testCase?: {
    description?: string;
    metadata?: Record<string, unknown>;
  };
  gradingResult?: {
    reason?: string;
    componentResults?: ComponentResult[];
  } | null;
};

function indent(text: string): string {
  return text
    .trim()
    .split("\n")
    .map((line) => `    ${line}`)
    .join("\n");
}

function failureReasons(result: EvalResult): string[] {
  if (result.failureReason === FAILURE_REASON_ERROR && result.error) {
    return [result.error];
  }

  const reasons = (result.gradingResult?.componentResults ?? [])
    .filter((component) => !component.pass && component.reason)
    .map((component) => component.reason as string);
  if (reasons.length > 0) {
    return reasons;
  }

  const reason = result.gradingResult?.reason || result.error;
  return reason ? [reason] : [];
}

/**
 * Returns whether all failed assertions failed because the grader could not
 * be reached, e.g. without Copilot access, rather than on their merits.
 */
function isGraderError(result: EvalResult): boolean {
  const failed = (result.gradingResult?.componentResults ?? []).filter(
    (component) => !component.pass
  );
  return (
    failed.length > 0 &&
    failed.every((component) => component.metadata?.["graderError"] === true)
  );
}

/**
 * Formats eval results as one line per test, in the order of the tests,
 * each followed by the reasons of its failed assertions or its error.
 */
export function formatReport(results: EvalResult[]): string {
  const lines: string[] = [];
  const sorted = Array.from(results).sort((a, b) => a.testIdx - b.testIdx);
  for (const result of sorted) {
    const description =
      result.testCase?.description ||
      result.description ||
      `Test #${result.testIdx + 1}`;
    const id = result.testCase?.metadata?.["id"];
    const title =
      typeof id === "string" ? `${description} [${id}]` : description;
    if (result.success) {
      lines.push(`${styleText("green", "✓")} ${title}`);
      continue;
    }

    if (
      result.failureReason === FAILURE_REASON_ERROR &&
      result.error?.startsWith("Skipped:")
    ) {
      lines.push(`${styleText("gray", "-")} ${title}`);
    } else if (
      result.failureReason === FAILURE_REASON_ERROR ||
      isGraderError(result)
    ) {
      lines.push(`${styleText("yellow", "!")} ${title}`);
    } else {
      lines.push(`${styleText("red", "✗")} ${title}`);
    }
    for (const reason of failureReasons(result)) {
      lines.push(indent(reason));
    }
  }
  return lines.join("\n");
}

/**
 * promptfoo `afterAll` extension hook that prints a report of the results,
 * and also writes it to `AGENT_EVALS_REPORT` if set.
 */
export function afterAll({ results }: { results: EvalResult[] }): void {
  const report = formatReport(results);
  console.log(`\n${report}\n`);

  const file = process.env["AGENT_EVALS_REPORT"];
  if (file) {
    fs.writeFileSync(file, `${report}\n`);
  }
}

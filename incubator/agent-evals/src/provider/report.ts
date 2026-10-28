import { styleText } from "node:util";

/** promptfoo's `ResultFailureReason.ERROR` */
const FAILURE_REASON_ERROR = 2;

type ComponentResult = {
  pass: boolean;
  reason?: string;
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
 * Formats eval results as one line per test, in the order of the tests,
 * followed by the reasons of failed assertions and errors, and a summary.
 */
export function formatReport(results: EvalResult[]): string {
  let passed = 0;
  let failed = 0;
  let errors = 0;
  const lines: string[] = [];
  const sorted = Array.from(results).sort((a, b) => a.testIdx - b.testIdx);
  for (const result of sorted) {
    const description =
      result.testCase?.description ||
      result.description ||
      `Test #${result.testIdx + 1}`;
    const id = result.testCase?.metadata?.["id"];
    const title = typeof id === "string" ? `${description} [${id}]` : description;
    if (result.success) {
      ++passed;
      lines.push(`${styleText("green", "✓")} ${title}`);
      continue;
    }

    if (result.failureReason === FAILURE_REASON_ERROR) {
      ++errors;
      lines.push(`${styleText("yellow", "!")} ${title}`);
    } else {
      ++failed;
      lines.push(`${styleText("red", "✗")} ${title}`);
    }
    for (const reason of failureReasons(result)) {
      lines.push(indent(reason));
    }
  }

  lines.push(
    "",
    `${sorted.length} tests: ${passed} passed, ${failed} failed, ${errors} errors`
  );
  return lines.join("\n");
}

/**
 * promptfoo `afterAll` extension hook that prints a report of the results.
 */
export function afterAll({ results }: { results: EvalResult[] }): void {
  console.log(`\n${formatReport(results)}\n`);
}

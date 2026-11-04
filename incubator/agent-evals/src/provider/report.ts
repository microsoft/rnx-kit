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
 * Outcome of a test: `unchecked` if it could not be evaluated, e.g. because
 * the grader is unavailable, and `skipped` if it needs the session log, which
 * could not be read.
 */
export type Status = "passed" | "failed" | "unchecked" | "skipped";

export function statusOf(result: EvalResult): Status {
  if (result.success) {
    return "passed";
  }
  if (result.failureReason === FAILURE_REASON_ERROR) {
    return result.error?.startsWith("Skipped:") ? "skipped" : "unchecked";
  }
  return isGraderError(result) ? "unchecked" : "failed";
}

function sortByTest(results: EvalResult[]): EvalResult[] {
  return Array.from(results).sort((a, b) => a.testIdx - b.testIdx);
}

function titleOf(result: EvalResult): { description: string; id?: string } {
  const description =
    result.testCase?.description ||
    result.description ||
    `Test #${result.testIdx + 1}`;
  const id = result.testCase?.metadata?.["id"];
  return typeof id === "string" ? { description, id } : { description };
}

const MARKERS: Record<Status, string> = {
  passed: styleText("green", "✓"),
  failed: styleText("red", "✗"),
  unchecked: styleText("yellow", "!"),
  skipped: styleText("gray", "-"),
};

/**
 * Formats eval results as one line per test, in the order of the tests,
 * each followed by the reasons of its failed assertions or its error.
 */
export function formatReport(results: EvalResult[]): string {
  const lines: string[] = [];
  for (const result of sortByTest(results)) {
    const { description, id } = titleOf(result);
    const status = statusOf(result);
    lines.push(
      `${MARKERS[status]} ${id ? `${description} [${id}]` : description}`
    );
    if (status !== "passed") {
      for (const reason of failureReasons(result)) {
        lines.push(indent(reason));
      }
    }
  }
  return lines.join("\n");
}

const SECTIONS: {
  status: Status;
  emoji: string;
  label: string;
  heading: string;
  collapsed: boolean;
}[] = [
  {
    status: "failed",
    emoji: "❌",
    label: "failed",
    heading: "Failed",
    collapsed: false,
  },
  {
    status: "unchecked",
    emoji: "⚠️",
    label: "not checked",
    heading: "Not checked",
    collapsed: false,
  },
  {
    status: "skipped",
    emoji: "⏭️",
    label: "skipped",
    heading: "Skipped: need the session log",
    collapsed: true,
  },
  {
    status: "passed",
    emoji: "✅",
    label: "passed",
    heading: "Passed",
    collapsed: true,
  },
];

/**
 * Escapes HTML, and breaks up `@mentions` and `#refs` with a zero-width space
 * so that they do not notify anyone or link to issues.
 */
function escapeText(text: string): string {
  return text
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replace(/([@#])(?=\w)/g, "$1&#8203;");
}

function quote(text: string): string {
  return text
    .trim()
    .split("\n")
    .map((line) => `  > ${escapeText(line)}`)
    .join("\n");
}

/**
 * Formats eval results as Markdown, e.g. for a pull request comment: a
 * summary, then the tests grouped by status, failures first. Skipped and
 * passed tests are collapsed.
 */
export function formatMarkdown(results: EvalResult[]): string {
  const groups = Object.groupBy(sortByTest(results), statusOf);
  const summary = SECTIONS.filter(({ status }) => groups[status])
    .map(
      ({ status, emoji, label }) =>
        `${emoji} ${groups[status]?.length} ${label}`
    )
    .join(" · ");

  const lines = [summary];
  for (const { status, emoji, heading, collapsed } of SECTIONS) {
    const group = groups[status];
    if (!group) {
      continue;
    }

    lines.push(
      "",
      collapsed
        ? `<details><summary>${emoji} ${heading} (${group.length})</summary>\n`
        : `#### ${emoji} ${heading}\n`
    );
    for (const result of group) {
      const { description, id } = titleOf(result);
      const title = escapeText(description);
      lines.push(id ? `- ${title} \`${id}\`` : `- ${title}`);
      if (status === "failed" || status === "unchecked") {
        for (const reason of failureReasons(result)) {
          lines.push(quote(reason));
        }
      }
    }
    // The reason for skipping is the same for all tests
    const skipReason = status === "skipped" ? group[0].error : undefined;
    if (skipReason) {
      lines.push("", quote(skipReason).trimStart());
    }
    if (collapsed) {
      lines.push("", "</details>");
    }
  }
  return lines.join("\n");
}

/**
 * promptfoo `afterAll` extension hook that prints a report of the results.
 */
export function afterAll({ results }: { results: EvalResult[] }): void {
  console.log(`\n${formatReport(results)}\n`);
}

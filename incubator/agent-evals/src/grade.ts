import { fail, toolPaths } from "./assertions.ts";
import { gradeRubric } from "./rubric.ts";
import type { GraderOptions } from "./rubric.ts";
import type {
  GradingResult,
  ProviderResponse,
  TestCase,
  Transcript,
} from "./types.ts";

// Eval files, or anything in an `evals/` folder, e.g. `evals/`, `evals/*` or
// `incubator/agent-evals/evals`. Bare file name patterns, e.g. `*.eval.ts` in
// `grep --include '*.eval.ts'`, are not paths and are ignored.
const EVALS_PATH = /\.eval\.m?ts$|(?:^|\/)evals\/|(?:^|\/)agent-evals\/evals$/;

/**
 * Returns paths of eval files that were read or written. Agents must not see
 * the evals, so any such access fails the run.
 */
export function evalsAccess({ entries }: Transcript): string[] {
  return entries.flatMap((entry) =>
    entry.type === "tool"
      ? toolPaths(entry)
          .map((p) => p.replaceAll("\\", "/"))
          .filter((p) => !p.startsWith("*") && EVALS_PATH.test(p))
      : []
  );
}

/**
 * Grades a single session against all assertions of a test case. The session
 * passes only if all assertions pass.
 */
export async function grade(
  testCase: TestCase,
  response: ProviderResponse,
  graderOptions: GraderOptions = {}
): Promise<GradingResult> {
  const access = evalsAccess(response.metadata.transcript);
  if (access.length > 0) {
    return fail(`Agent accessed eval files (${access.join(", ")})`);
  }

  // Script checks run first; rubrics are only graded if they all pass since
  // the session fails either way
  const context = { providerResponse: response };
  const componentResults: GradingResult[] = [];
  for (const [i, assertion] of testCase.assert.entries()) {
    if (assertion.type === "javascript") {
      componentResults[i] = await assertion.value(response.output, context);
    }
  }

  const scriptsPassed = componentResults.every((result) => result.pass);
  for (const [i, assertion] of testCase.assert.entries()) {
    if (assertion.type === "llm-rubric") {
      componentResults[i] = scriptsPassed
        ? await gradeRubric(assertion.value, response.metadata, graderOptions)
        : fail("Rubric skipped because a script check failed");
    }
  }

  const pass = componentResults.every((result) => result.pass);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: componentResults.map(({ reason }) => reason).join("; "),
    componentResults,
  };
}

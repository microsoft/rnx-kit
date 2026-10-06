import { EVALS_PACKAGE, evalsPackageAccess, fail } from "./assertions.ts";
import { gradeRubric, type GraderOptions } from "./rubric.ts";
import type { GradingResult, ProviderResponse, TestCase } from "./types.ts";

/**
 * Grades a single session against all assertions of a test case. The session
 * passes only if all assertions pass.
 */
export async function grade(
  testCase: TestCase,
  response: ProviderResponse,
  graderOptions: GraderOptions = {}
): Promise<GradingResult> {
  const { transcript } = response.metadata;
  const access = evalsPackageAccess(transcript);
  if (access.length > 0) {
    return fail(`Agent accessed ${EVALS_PACKAGE} (${access.join(", ")})`);
  }

  const context = { vars: testCase.vars, providerResponse: response };
  const componentResults: GradingResult[] = [];
  for (const assertion of testCase.assert) {
    componentResults.push(
      assertion.type === "javascript"
        ? await assertion.value(response.output, context)
        : await gradeRubric(assertion.value, transcript, graderOptions)
    );
  }

  const pass = componentResults.every((result) => result.pass);
  return {
    pass,
    score: pass ? 1 : 0,
    reason: componentResults.map(({ reason }) => reason).join("; "),
    componentResults,
  };
}

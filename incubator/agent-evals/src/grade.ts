import { fail } from "./assertions.ts";
import { gradeRubric } from "./rubric.ts";
import type { GraderOptions } from "./rubric.ts";
import type {
  GradingResult,
  ProviderResponse,
  TestCase,
  Transcript,
} from "./types.ts";

/**
 * Returns the tool calls that access eval files. Agents must not see the
 * evals, so any such access fails the run.
 */
function evalsAccess({ entries }: Transcript): string[] {
  return entries
    .filter(
      (entry) =>
        entry.type === "tool" &&
        /\.eval\.m?ts\b/.test(JSON.stringify(entry.arguments))
    )
    .map((entry) => (entry.type === "tool" ? entry.name : ""));
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
  const { transcript } = response.metadata;
  const access = evalsAccess(transcript);
  if (access.length > 0) {
    return fail(`Agent accessed eval files (${access.join(", ")})`);
  }

  const context = { providerResponse: response };
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

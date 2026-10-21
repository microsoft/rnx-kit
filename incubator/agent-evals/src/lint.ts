import { parseSync } from "oxc-parser";
import {
  addedLines,
  existingFiles,
  requireConfig,
  result,
  toAgentRun,
} from "./common.ts";
import type {
  AgentRun,
  AssertionContext,
  GradingResult,
  TypeSpecifierMatcher,
} from "./types.ts";

/**
 * Passes if the matching files do not use inline `type` specifiers in import
 * or export statements, e.g. `import { type A, b }`. Passes trivially if no
 * files match.
 */
export function noInlineTypeSpecifiers(
  output: AgentRun | string,
  context: AssertionContext<TypeSpecifierMatcher>
): GradingResult {
  const run = toAgentRun(output);
  const { files, addedLinesOnly } = requireConfig(context);
  const pathPattern = new RegExp(files);
  const added = addedLinesOnly ? addedLines(run.diff) : undefined;

  const failures: string[] = [];
  const checked: string[] = [];
  for (const file of existingFiles(run)) {
    if (!pathPattern.test(file.path)) {
      continue;
    }

    const lines = added?.get(file.path);
    if (added && !lines?.size) {
      continue;
    }

    checked.push(file.path);
    const content = file.content ?? "";
    const { program, errors } = parseSync(file.path, content);
    for (const { message } of errors) {
      failures.push(`${file.path}: ${message}`);
    }

    // Only top-level statements are checked; imports and exports nested in
    // ambient module declarations (`declare module "…" {}`) are not. Lint
    // allows these; `typescript/no-namespace` only rejects named namespaces.
    for (const node of program.body) {
      let keyword: string;
      let specifiers: { start: number }[];
      if (node.type === "ImportDeclaration") {
        keyword = "import";
        specifiers = node.specifiers.filter(
          (s) => s.type === "ImportSpecifier" && s.importKind === "type"
        );
      } else if (node.type === "ExportNamedDeclaration") {
        keyword = "export";
        specifiers = node.specifiers.filter((s) => s.exportKind === "type");
      } else {
        continue;
      }

      for (const { start } of specifiers) {
        const line = content.substring(0, start).split("\n").length;
        if (!added || lines?.has(line)) {
          failures.push(
            `${file.path}:${line}: Use a separate \`${keyword} type\` statement`
          );
        }
      }
    }
  }

  return result(failures, `Checked ${checked.join(", ") || "(none)"}`);
}

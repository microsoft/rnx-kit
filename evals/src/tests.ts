import { readJSONFileSync } from "@rnx-kit/tools-filesystem";
import * as fs from "node:fs";
import * as path from "node:path";
import {
  addedLines,
  existingFiles,
  result,
  selectLines,
  toAgentRun,
} from "./common.ts";
import type { AgentRun, GradingResult } from "./types.ts";
import { owningPackageDir, workspacePackages } from "./workspace.ts";

const TEST_FILE = /\.test\.[cm]?[jt]sx?$/;
const JEST_API = /\bexpect\(|\bjest\.|@jest\/globals/;
const NODE_API = /from ["']node:(assert\/strict|test)/;

/**
 * Passes if every changed test file is written for the test runner of its
 * package: Jest if the package has a `jest` field in `package.json` or a
 * `jest.config.js`, otherwise the Node.js test runner. Fails if no test files
 * changed.
 *
 * Note: This mirrors `useJest()` in `scripts/src/commands/test.js`.
 */
export function usesPackageTestRunner(
  output: AgentRun | string
): GradingResult {
  const run = toAgentRun(output);
  const tests = existingFiles(run).filter((file) => {
    return (
      path.win32.basename(path.win32.dirname(file.path)) === "test" &&
      TEST_FILE.test(path.win32.basename(file.path))
    );
  });
  if (tests.length === 0) {
    return result(["No test files changed"], "");
  }

  const added = addedLines(run.diff);
  const dirs = [...workspacePackages(run.workdir).values()];
  const failures: string[] = [];
  for (const file of tests) {
    const dir = path.join(run.workdir, owningPackageDir(dirs, file.path));
    const jest =
      fs.existsSync(path.join(dir, "jest.config.js")) ||
      Boolean(readJSONFileSync(path.join(dir, "package.json")).jest);
    const content = file.content ?? "";
    const newLines = selectLines(file, added);
    if (jest) {
      if (NODE_API.test(newLines)) {
        failures.push(`${file.path}: uses 'node:test' in a Jest package`);
      }
    } else {
      if (!NODE_API.test(content)) {
        failures.push(
          `${file.path}: missing imports from 'node:test' and 'node:assert/strict'`
        );
      }
      if (JEST_API.test(newLines)) {
        failures.push(
          `${file.path}: uses Jest in a Node.js test runner package`
        );
      }
    }
  }

  return result(
    failures,
    `Checked ${tests.map((file) => file.path).join(", ")}`
  );
}

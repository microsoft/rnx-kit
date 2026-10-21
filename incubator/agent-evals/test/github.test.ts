import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { modifiedNumbers } from "../src/provider/github.ts";
import { parseShellInput } from "../src/provider/shell.ts";

function modified(input: string): number[] {
  const commands = parseShellInput(input).map((argv) => ({ argv, cwd: "." }));
  return modifiedNumbers("microsoft/rnx-kit", [], commands);
}

describe("modifiedNumbers()", () => {
  it("skips the values of flags before the number", () => {
    const input = [
      "gh pr comment -F body.md 1",
      "gh pr close -c done 2",
      "gh issue close -r completed 3",
      "gh pr edit --add-reviewer bob 4",
    ].join("\n");
    deepEqual(modified(input), [1, 2, 3, 4]);
  });

  it("handles flags that only take a value in some commands", () => {
    const input =
      "gh pr merge -s -d 1; gh pr review -a 2; gh issue develop -c 3";
    deepEqual(modified(input), [1, 2, 3]);
  });

  it("reads the repository in any form", () => {
    const input = [
      "gh pr comment -R microsoft/rnx-kit 1",
      "gh pr comment --repo=microsoft/rnx-kit 2",
      "gh pr comment -Rmicrosoft/rnx-kit 3",
      "gh pr comment -Rfork/rnx-kit 4",
      "gh pr comment --repo fork/rnx-kit 5",
    ].join("\n");
    deepEqual(modified(input), [1, 2, 3]);
  });

  it("accepts issue and pull request URLs", () => {
    const input = [
      "gh issue comment https://github.com/microsoft/rnx-kit/issues/1",
      "gh pr review https://github.com/microsoft/rnx-kit/pull/2/files",
      "gh pr close '#3'",
    ].join("\n");
    deepEqual(modified(input), [1, 2, 3]);
  });

  it("does not mistake flag values for the number", () => {
    const input = [
      "gh issue close --duplicate-of 9 1",
      'gh pr comment --body "Fixed in https://github.com/microsoft/rnx-kit/pull/9" 2',
      "gh pr comment -- 3",
    ].join("\n");
    deepEqual(modified(input), [1, 2, 3]);
  });

  it("detects the method and fields of `gh api` in any form", () => {
    const input = [
      "gh api --method=PATCH repos/microsoft/rnx-kit/issues/1",
      "gh api -XPATCH repos/microsoft/rnx-kit/issues/2",
      "gh api --field=body=x repos/{owner}/{repo}/issues/3/comments",
      "gh api -fbody=x repos/microsoft/rnx-kit/issues/4/comments",
      "gh api repos/microsoft/rnx-kit/issues/5",
    ].join("\n");
    deepEqual(modified(input), [1, 2, 3, 4]);
  });
});

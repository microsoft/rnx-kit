import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { modifiedNumbers } from "../src/provider/github.ts";
import { parseShellInput } from "../src/provider/shell.ts";

function modified(input: string): number[] {
  const commands = parseShellInput(input).map((argv) => ({ argv, cwd: "." }));
  return modifiedNumbers([], commands);
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
    deepEqual(modified("gh pr merge -s -d 1; gh pr review -a 2"), [1, 2]);
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

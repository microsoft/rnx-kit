import { throws } from "node:assert/strict";
import { describe, it } from "node:test";
import { REJECTED_ARGS, git } from "../src/git.ts";

describe("git()", () => {
  it("rejects `--upload-pack`", () => {
    const pack = "sudo -u nobody git-upload-pack";

    for (const arg of REJECTED_ARGS) {
      throws(
        () => git(arg, pack),
        new Error(`Unsafe git argument rejected: ${arg}`)
      );

      const flag = `${arg}=${pack}`;
      throws(
        () => git(flag),
        new Error(`Unsafe git argument rejected: ${flag}`)
      );
    }
  });
});

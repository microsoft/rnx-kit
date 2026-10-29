import { deepEqual, equal, ok } from "node:assert/strict";
import * as fs from "node:fs";
import * as path from "node:path";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { addedLines } from "../src/common.ts";
import { addWorktree, collectChanges, git } from "../src/provider/checkout.ts";

describe("collectChanges()", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));

  it("returns paths and a diff regardless of the user's git config", async () => {
    const commit = (await git(root, ["rev-parse", "HEAD"])).trim();
    const workdir = await addWorktree(root, commit);
    const pkg = path.join(workdir, "incubator", "agent-evals");
    fs.appendFileSync(path.join(pkg, "README.md"), "\nAdded line\n");
    fs.writeFileSync(path.join(pkg, "ärende.md"), "Ny fil\n");
    fs.rmSync(path.join(pkg, "tsconfig.json"));

    // Settings that change the paths, colors or tool used by `git diff`
    const config = process.env["GIT_CONFIG_PARAMETERS"];
    process.env["GIT_CONFIG_PARAMETERS"] = [
      "'diff.mnemonicPrefix=true'",
      "'diff.noprefix=true'",
      "'color.diff=always'",
      "'diff.external=false'",
    ].join(" ");
    try {
      const { files, diff } = await collectChanges(workdir, commit);
      deepEqual(
        files.map(({ path, status }) => ({ path, status })),
        [
          { path: "incubator/agent-evals/README.md", status: "modified" },
          { path: "incubator/agent-evals/tsconfig.json", status: "deleted" },
          { path: "incubator/agent-evals/ärende.md", status: "added" },
        ]
      );
      deepEqual(
        Array.from(addedLines(diff).keys()).sort(),
        files
          .filter(({ status }) => status !== "deleted")
          .map(({ path }) => path)
          .sort()
      );
      ok(!diff.includes("\u001b["), "diff contains color codes");
      equal(diff.endsWith("\n"), true);
    } finally {
      if (config === undefined) {
        delete process.env["GIT_CONFIG_PARAMETERS"];
      } else {
        process.env["GIT_CONFIG_PARAMETERS"] = config;
      }
    }
  });
});

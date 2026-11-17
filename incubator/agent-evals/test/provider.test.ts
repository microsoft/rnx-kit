import { equal, rejects } from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import CopilotSessionProvider, {
  endBranch,
  parseRepository,
  resolveRepository,
} from "../src/provider/provider.ts";

describe("parseRepository()", () => {
  it("returns `owner/repo` from HTTPS URLs", () => {
    equal(parseRepository("https://github.com/owner/repo"), "owner/repo");
    equal(parseRepository("https://github.com/owner/repo.git"), "owner/repo");
    equal(parseRepository("https://github.com/owner/repo/"), "owner/repo");
    equal(
      parseRepository("https://user@ghe.example.com/owner/repo.git\n"),
      "owner/repo"
    );
  });

  it("returns `owner/repo` from SSH URLs", () => {
    equal(parseRepository("git@github.com:owner/repo.git"), "owner/repo");
    equal(parseRepository("ssh://git@github.com/owner/repo"), "owner/repo");
  });

  it("keeps dots in repository names", () => {
    equal(
      parseRepository("https://github.com/owner/repo.js.git"),
      "owner/repo.js"
    );
  });

  it("returns `undefined` for URLs without owner and repository", () => {
    equal(parseRepository(""), undefined);
    equal(parseRepository("repo"), undefined);
  });
});

describe("resolveRepository()", () => {
  const root = fileURLToPath(new URL("..", import.meta.url));

  it("returns the configured repository", async () => {
    equal(
      await resolveRepository(root, {
        repository: "owner/repo",
        remote: "does-not-exist",
      }),
      "owner/repo"
    );
  });

  it("throws if the remote does not exist", async () => {
    await rejects(resolveRepository(root, { remote: "does-not-exist" }), {
      message:
        "Could not determine the GitHub repository from remote 'does-not-exist'; set 'repository' in the provider config",
    });
  });
});

describe("endBranch()", () => {
  // Newest entry first, as listed by `git reflog`
  const reflog = [
    "HEAD@{600}\tBranch: renamed refs/heads/fix/bug to refs/heads/fix/crash",
    "HEAD@{500}\tBranch: renamed refs/heads/other to refs/heads/fix/bug",
    "HEAD@{400}\tcommit: Fix bug",
    "HEAD@{300}\tcheckout: moving from feature to fix/bug",
    "HEAD@{200}\tcheckout: moving from main to feature",
    "HEAD@{100}\tcheckout: moving from feature to main",
    "",
  ].join("\n");

  it("returns the branch of the last checkout during the session", () => {
    equal(endBranch(reflog, "main", 150_000, 250_000), "feature");
    // Times are rounded outwards to whole seconds
    equal(endBranch(reflog, "main", 200_999, 299_000), "feature");
    equal(endBranch(reflog, "main", 200_999, 299_001), "fix/crash");
  });

  it("follows renames of the branch, also after the session", () => {
    equal(endBranch(reflog, "main", 150_000, 450_000), "fix/crash");
    equal(endBranch(reflog, "fix/bug", 550_000, 650_000), "fix/crash");
  });

  it("returns the start branch if the session did not switch branches", () => {
    equal(endBranch(reflog, "main", 310_000, 450_000), "main");
    equal(endBranch(reflog, "main", 0, 50_000), "main");
    equal(endBranch("", undefined, 0, 500_000), undefined);
  });
});

describe("CopilotSessionProvider.callApi()", () => {
  it("rejects invalid pull request numbers", async () => {
    const provider = new CopilotSessionProvider();

    for (const pullRequest of ["0", "012", "-1", "1e3", "1; rm -rf /"]) {
      await rejects(
        provider.callApi("", { vars: { pullRequest } }),
        new Error(`Invalid pull request number: ${pullRequest}`)
      );
    }
  });
});

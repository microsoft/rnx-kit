import { equal, rejects } from "node:assert/strict";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { git } from "../src/provider/checkout.ts";
import { github, parseRepository } from "../src/provider/github.ts";
import CopilotSessionProvider, {
  endBranch,
  forkPoint,
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
      await resolveRepository(root, github, {
        repository: "owner/repo",
        remote: "does-not-exist",
      }),
      "owner/repo"
    );
  });

  it("throws if the remote does not exist", async () => {
    await rejects(
      resolveRepository(root, github, { remote: "does-not-exist" }),
      {
        message:
          "Could not determine the repository from remote 'does-not-exist'; set 'repository' in the provider config",
      }
    );
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

describe("forkPoint()", () => {
  // `forkPoint()` runs the real `git`, so it needs a real repository
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "agent-evals-test-"));
  const commits: Record<string, string> = {};

  async function commit(name: string): Promise<void> {
    await git(root, [
      "-c",
      "user.name=test",
      "-c",
      "user.email=test@example.com",
      "commit",
      "--quiet",
      "--allow-empty",
      "--no-verify",
      "--no-gpg-sign",
      "-m",
      name,
    ]);
    commits[name] = (await git(root, ["rev-parse", "HEAD"])).trim();
  }

  // main:    A - B
  //           \   \
  // old:       C   \
  // feature:        D
  before(async () => {
    await git(root, ["init", "--quiet", "--initial-branch=main"]);
    await commit("A");
    await git(root, ["switch", "--quiet", "-c", "old"]);
    await commit("C");
    await git(root, ["switch", "--quiet", "main"]);
    await commit("B");
    await git(root, ["switch", "--quiet", "-c", "feature"]);
    await commit("D");
    await git(root, ["switch", "--quiet", "main"]);
    await git(root, ["update-ref", "refs/remotes/origin/main", commits["B"]]);
  });

  after(() => {
    fs.rmSync(root, { recursive: true, force: true, maxRetries: 3 });
  });

  it("skips commits that landed on the base branch during the session", async () => {
    const config = { baseBranch: "main" };
    const { A, B, D } = commits;
    equal(await forkPoint(root, config, "feature", A, D), B);
  });

  it("returns the start commit if it follows the fork point", async () => {
    const config = { baseBranch: "main" };
    const { A, C, D } = commits;
    equal(await forkPoint(root, config, "old", C, C), C);
    equal(await forkPoint(root, config, "feature", D, D), D);
    equal(await forkPoint(root, config, "old", A, C), A);
  });

  it("returns the start commit on the base branch", async () => {
    const { A, B } = commits;
    equal(await forkPoint(root, { baseBranch: "main" }, "main", A, B), A);
  });

  it("returns the start commit if the base branch is not found", async () => {
    const { A, D } = commits;
    equal(await forkPoint(root, { baseBranch: "trunk" }, "feature", A, D), A);
    equal(await forkPoint(root, { remote: "none" }, "feature", A, D), A);
  });

  it("defaults to the default branch of the remote", async () => {
    const { A, B, D } = commits;
    await git(root, ["remote", "add", "upstream", root]);
    await git(root, ["update-ref", "refs/remotes/upstream/main", B]);
    equal(await forkPoint(root, { remote: "upstream" }, "feature", A, D), B);

    await git(root, [
      "symbolic-ref",
      "refs/remotes/origin/HEAD",
      "refs/remotes/origin/main",
    ]);
    equal(await forkPoint(root, {}, "feature", A, D), B);
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

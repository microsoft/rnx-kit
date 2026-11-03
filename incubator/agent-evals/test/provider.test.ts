import { equal, rejects } from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import {
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

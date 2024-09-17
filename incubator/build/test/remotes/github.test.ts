import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { getRepositoryInfo } from "../../src/remotes/github";

describe("getRepositoryInfo()", () => {
  const currentInfo = {
    owner: "microsoft",
    repo: "rnx-kit",
  };

  it("returns owner and repository name", () => {
    const gitUrls = [
      undefined,
      "https://github.com/microsoft/rnx-kit.git",
      "git@github.com:microsoft/rnx-kit.git",
    ];
    for (const url of gitUrls) {
      deepEqual(getRepositoryInfo("origin", url), currentInfo);
    }
  });

  it("returns undefined if source is not 'github.com'", () => {
    const azureUrl = "https://dev.azure.com/microsoft/rnx-kit";
    equal(getRepositoryInfo("origin", azureUrl), undefined);
  });
});

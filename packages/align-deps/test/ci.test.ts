import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { logGroupFor } from "../src/ci.ts";

describe("logGroupFor()", () => {
  it("returns GitHub Actions group markers", () => {
    deepEqual(
      logGroupFor("packages/app/package.json", { GITHUB_ACTIONS: "true" }),
      {
        start: "::group::packages/app/package.json",
        end: "::endgroup::",
      }
    );
  });

  it("escapes GitHub Actions command values", () => {
    deepEqual(
      logGroupFor("packages/%app\r\n/package.json", {
        GITHUB_ACTIONS: "true",
      }),
      {
        start: "::group::packages/%25app%0D%0A/package.json",
        end: "::endgroup::",
      }
    );
  });

  it("returns Azure DevOps group markers", () => {
    deepEqual(logGroupFor("packages/app/package.json", { TF_BUILD: "True" }), {
      start: "##[group]packages/app/package.json",
      end: "##[endgroup]",
    });
  });

  it("does not group local output", () => {
    equal(logGroupFor("packages/app/package.json", {}), undefined);
  });
});

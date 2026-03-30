import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { IgnoreFetcher } from "../src/IgnoreFetcher.ts";
import { makePackageInfo } from "./helper.ts";

describe("IgnoreFetcher", () => {
  const fetcher = new IgnoreFetcher();

  it("supports `ignore:` protocol", () => {
    const { locator } = makePackageInfo();

    ok(fetcher.supports(locator));
  });

  it("returns `null` local path", () => {
    equal(fetcher.getLocalPath(), null);
  });
});

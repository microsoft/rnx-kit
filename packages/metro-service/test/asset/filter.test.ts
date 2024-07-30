import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { filterPlatformAssetScales } from "../../src/asset/filter";

describe("filterPlatformAssetScales", () => {
  it("removes everything but 2x and 3x for iOS", () => {
    deepEqual(
      filterPlatformAssetScales([1, 2, 3], [1, 1.5, 2, 3, 4]),
      [1, 2, 3]
    );
    deepEqual(filterPlatformAssetScales([1, 2, 3], [3, 4]), [3]);
  });

  it("keeps closest largest one if nothing matches", () => {
    deepEqual(filterPlatformAssetScales([1, 2, 3], [0.5, 4, 100]), [4]);
    deepEqual(filterPlatformAssetScales([1, 2, 3], [0.5, 100]), [100]);
    deepEqual(filterPlatformAssetScales([1, 2, 3], [0.5]), [0.5]);
    deepEqual(filterPlatformAssetScales([1, 2, 3], []), []);
  });

  it("keeps all scales for unknown platform", () => {
    deepEqual(
      filterPlatformAssetScales(undefined, [1, 1.5, 2, 3.7]),
      [1, 1.5, 2, 3.7]
    );
  });
});

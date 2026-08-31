import { getDefaultBundlerPlugins } from "../../src/bundle/defaultPlugins.ts";

describe("getDefaultBundlerPlugins", () => {
  it("returns the default plugins with tree shaking disabled", () => {
    expect(getDefaultBundlerPlugins()).toEqual({
      plugins: [
        "@rnx-kit/metro-plugin-cyclic-dependencies-detector",
        "@rnx-kit/metro-plugin-duplicates-checker",
      ],
      treeShake: false,
    });
  });
});

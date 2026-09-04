import type { Config as CLIConfig } from "@react-native-community/cli-types";
import type { ConfigT, InputConfigT } from "metro-config";
import { deepEqual } from "node:assert/strict";
import { createRequire } from "node:module";
import { after, before, describe, it } from "node:test";
import { URL, fileURLToPath } from "node:url";
import { loadMetroConfig } from "../src/config.ts";

// The fixture stubs out `metro-config` and returns the arguments it was called
// with so that we can inspect the config that Metro would have received.
type LoadConfigArgs = { defaultConfig: InputConfigT };

describe("loadMetroConfig", () => {
  const fixture = fileURLToPath(
    new URL("__fixtures__/metro-config/", import.meta.url)
  );

  before(() => {
    global.require = createRequire(fixture);
  });

  after(() => {
    // @ts-expect-error Tests are run in ESM mode where `require` is not defined
    global.require = undefined;
  });

  function loadConfig(defaultConfig: InputConfigT, assetPlugins: string[]) {
    const cliConfig = { root: fixture } as CLIConfig;
    return loadMetroConfig(
      cliConfig,
      { assetPlugins },
      () => defaultConfig
    ) as Promise<ConfigT & LoadConfigArgs>;
  }

  it("passes asset plugins on to Metro when there is no default config", async () => {
    const { defaultConfig } = await loadConfig({} as InputConfigT, [
      "my-asset-plugin",
    ]);

    deepEqual(defaultConfig.transformer, {
      assetPlugins: ["my-asset-plugin"],
    });
  });

  it("passes asset plugins on to Metro without dropping transformer options", async () => {
    const { defaultConfig } = await loadConfig(
      {
        transformer: { assetRegistryPath: "@rnx-kit/asset-registry" },
      } as InputConfigT,
      ["my-asset-plugin"]
    );

    deepEqual(defaultConfig.transformer, {
      assetRegistryPath: "@rnx-kit/asset-registry",
      assetPlugins: ["my-asset-plugin"],
    });
  });
});

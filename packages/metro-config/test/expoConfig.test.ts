import type { MetroConfig } from "metro-config";
import { deepEqual, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { applyExpoWorkarounds, isExpoConfig } from "../src/expoConfig";

describe("isExpoConfig()", () => {
  it("returns true when it's likely a config comes from Expo", () => {
    ok(!isExpoConfig());
    ok(!isExpoConfig({}));
    ok(
      !isExpoConfig({
        transformer: { babelTransformerPath: "metro-babel-transformer" },
      })
    );
    ok(!isExpoConfig({ transformerPath: "metro-transform-worker" }));

    ok(
      isExpoConfig({
        transformer: { _expoRelativeProjectRoot: null },
      } as MetroConfig)
    );
    ok(isExpoConfig({ transformer: { babelTransformerPath: "@expo" } }));
    ok(isExpoConfig({ transformerPath: "@expo" }));
  });
});

describe("applyExpoWorkarounds()", () => {
  it("removes `config.resolver.resolveRequest` when it's `null`", () => {
    const config = { resolver: { resolveRequest: null } };

    ok("resolveRequest" in config.resolver);

    applyExpoWorkarounds(config as MetroConfig, {});

    ok(!("resolveRequest" in config.resolver));
  });

  it("replaces `config.serializer.getModulesRunBeforeMainModule`", () => {
    const expoConfig = {
      serializer: {
        getModulesRunBeforeMainModule: () => [
          "react-native/Libraries/Core/InitializeCore.js",
          "expo/build/winter",
          "@expo/metro-runtime",
        ],
      },
    };

    const defaultConfig = {
      serializer: {
        getModulesRunBeforeMainModule: () => [
          "react-native/Libraries/Core/InitializeCore.js",
          "react-native-macos/Libraries/Core/InitializeCore.js",
          "react-native-windows/Libraries/Core/InitializeCore.js",
        ],
      },
    };

    applyExpoWorkarounds(expoConfig, defaultConfig);

    deepEqual(expoConfig.serializer.getModulesRunBeforeMainModule(), [
      "react-native/Libraries/Core/InitializeCore.js",
      "react-native-macos/Libraries/Core/InitializeCore.js",
      "react-native-windows/Libraries/Core/InitializeCore.js",
      "expo/build/winter",
      "@expo/metro-runtime",
    ]);
  });
});

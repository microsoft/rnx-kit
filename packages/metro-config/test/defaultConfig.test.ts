import { match, ok } from "node:assert";
import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { fileURLToPath } from "node:url";
import { getDefaultConfig } from "../src/defaultConfig.js";

describe("getDefaultConfig()", () => {
  // @ts-expect-error Tests are run in ESM context
  const thisFile = import.meta.url;

  const projectRoot = fileURLToPath(
    new URL("__fixtures__/awesome-repo/quaid", thisFile)
  );

  it("returns default Metro config", async () => {
    const [config] = getDefaultConfig(projectRoot);
    const { resolver, serializer, transformer } = config;

    deepEqual(resolver?.platforms, ["android", "ios"]);
    equal(typeof resolver.resolveRequest, "function");

    const prelude = serializer?.getModulesRunBeforeMainModule?.(
      fileURLToPath(thisFile)
    );

    ok(Array.isArray(prelude));
    equal(prelude.length, 1);
    match(prelude[0], /[/\\]Libraries[/\\]Core[/\\]InitializeCore.js$/);
    ok(transformer);
    ok(!transformer.assetRegistryPath);
  });

  it("returns config for web", async () => {
    const [config] = getDefaultConfig(projectRoot, "web");
    const { resolver, serializer, transformer } = config;

    deepEqual(resolver?.platforms, ["android", "ios"]);
    equal(typeof resolver.resolveRequest, "function");

    const prelude = serializer?.getModulesRunBeforeMainModule?.(
      fileURLToPath(thisFile)
    );

    ok(Array.isArray(prelude));
    equal(prelude.length, 1);
    match(prelude[0], /[/\\]Libraries[/\\]Core[/\\]InitializeCore.js$/);
    ok(transformer);
    match(
      transformer.assetRegistryPath ?? "",
      /node_modules[/\\]react-native-web[/\\]dist[/\\]modules[/\\]AssetRegistry[/\\]index.js$/
    );
  });
});

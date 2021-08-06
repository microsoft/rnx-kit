import "jest-extended";
import type { KitConfig } from "../src/kitConfig";
import type { ServerConfig } from "../src/serverConfig";
import { getServerConfig } from "../src/getServerConfig";

const kitConfigNoServer: KitConfig = {};

const kitConfigEmptyServer: KitConfig = {
  server: {},
};

const kitConfigWithServer: KitConfig = {
  server: {
    projectRoot: "my-project-root",
    detectCyclicDependencies: true,
    detectDuplicateDependencies: false,
    typescriptValidation: true,
    experimental_treeShake: false,
    assetPlugins: ["asset-plugin-package"],
    sourceExts: ["json", "jsrc"],
  },
};

function validateDefaultConfig(c: ServerConfig) {
  expect(c).toContainAllKeys([
    "projectRoot",
    "detectCyclicDependencies",
    "detectDuplicateDependencies",
    "typescriptValidation",
    "experimental_treeShake",
  ]);
  expect(c.projectRoot).toEqual("src");
  expect(c.detectCyclicDependencies).toBeTrue();
  expect(c.detectDuplicateDependencies).toBeTrue();
  expect(c.typescriptValidation).toBeTrue();
  expect(c.experimental_treeShake).toBeFalse();
}

describe("getServerConfig()", () => {
  test("returns defaults when the kit has no server config", () => {
    const c = getServerConfig(kitConfigNoServer);
    validateDefaultConfig(c);
  });

  test("returns defaults when the kit has an empty server config", () => {
    const c = getServerConfig(kitConfigEmptyServer);
    validateDefaultConfig(c);
  });

  test("returns server config from kit config", () => {
    const c = getServerConfig(kitConfigWithServer);
    expect(c.projectRoot).toEqual("my-project-root");
    expect(c.detectCyclicDependencies).toBeTrue();
    expect(c.detectDuplicateDependencies).toBeFalse();
    expect(c.typescriptValidation).toBeTrue();
    expect(c.experimental_treeShake).toBeFalse();
    expect(c.assetPlugins).toBeArrayOfSize(1);
    expect(c.assetPlugins).toIncludeSameMembers(["asset-plugin-package"]);
    expect(c.sourceExts).toBeArrayOfSize(2);
    expect(c.sourceExts).toIncludeSameMembers(["json", "jsrc"]);
  });
});

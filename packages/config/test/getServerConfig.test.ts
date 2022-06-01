import "jest-extended";
import { getServerConfig } from "../src/getServerConfig";

describe("getServerConfig()", () => {
  test("returns undefined when both the server and bundle properties are not present", () => {
    expect(getServerConfig({})).toBeUndefined();
  });

  test("returns undefined when the server property is not present and bundling is disabled", () => {
    expect(getServerConfig({ bundle: undefined })).toBeUndefined();
  });

  test("returns undefined when the server property is set to undefined", () => {
    expect(getServerConfig({ server: undefined })).toBeUndefined();
  });

  test("returns bundle config data when the server property is not present", () => {
    const config = getServerConfig({
      bundle: { entryFile: "x", detectCyclicDependencies: true },
    });
    expect(config).not.toHaveProperty("entryFile");
    expect(config.detectCyclicDependencies).toBeTrue();
  });

  test("returns server config", () => {
    const config = getServerConfig({
      server: { projectRoot: "x", treeShake: false },
    });
    expect(config.projectRoot).toBe("x");
    expect(config.treeShake).toBeFalse();
  });
});

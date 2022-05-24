import "jest-extended";
import { getServerConfig } from "../src/getServerConfig";

describe("getServerConfig()", () => {
  test("fails when server is not present and bundling is not present", () => {
    expect(() => getServerConfig({})).toThrowError(
      /The rnx-kit configuration for this package has no server config, nor does it have bundling config to use as a baseline for running the bundle server./i
    );
  });

  test("fails when server is not present and bundling is disabled", () => {
    expect(() => getServerConfig({ bundle: false })).toThrowError(
      /The rnx-kit configuration for this package has no server config, nor does it have bundling config to use as a baseline for running the bundle server./i
    );
  });

  test("fails when server is set to undefined", () => {
    expect(() => getServerConfig({ server: undefined })).toThrowError(
      /Bundle serving is explicitly disabled/i
    );
  });

  test("returns bundle config data when server is not set but bundling is", () => {
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

import "jest-extended";
import { getServerConfig } from "../src/getServerConfig";

describe("getServerConfig()", () => {
  test("returns undefined when the server property is not present", () => {
    expect(getServerConfig({})).toBeUndefined();
  });

  test("returns undefined when the server property is set to undefined", () => {
    expect(getServerConfig({ server: undefined })).toBeUndefined();
  });

  test("returns server config", () => {
    const config = getServerConfig({
      server: { projectRoot: "x", treeShake: false },
    });
    expect(config.projectRoot).toBe("x");
    expect(config.treeShake).toBeFalse();
  });
});

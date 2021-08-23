import "jest-extended";
import { getKitBundleDefinition } from "../../src/bundle/kit-config";

describe("CLI > Bundle > Kit Config > getKitBundleDefinition", () => {
  const rnxKitConfig = require("@rnx-kit/config");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  beforeEach(() => {
    rnxKitConfig.__setMockConfig(undefined);
    consoleWarnSpy.mockReset();
  });

  test("throws when kit config is not found", () => {
    expect(() => getKitBundleDefinition()).toThrowError();
  });

  test("returns undefined with a warning message when bundle configuration is missing", () => {
    rnxKitConfig.__setMockConfig({});
    expect(getKitBundleDefinition()).toBeUndefined();
    expect(consoleWarnSpy).toBeCalledTimes(1);
    expect(consoleWarnSpy).toBeCalledWith(
      expect.anything(),
      expect.stringContaining("No bundle configuration found")
    );
  });

  test("returns undefined with a warning message when bundling is disabled", () => {
    rnxKitConfig.__setMockConfig({ bundle: false });
    expect(getKitBundleDefinition()).toBeUndefined();
    expect(consoleWarnSpy).toBeCalledTimes(1);
    expect(consoleWarnSpy).toBeCalledWith(
      expect.anything(),
      expect.stringContaining("Bundling is disabled")
    );
  });

  test("returns a bundle definition when bundling is enabled", () => {
    rnxKitConfig.__setMockConfig({ bundle: true });
    const definition = getKitBundleDefinition();
    expect(consoleWarnSpy).not.toBeCalled();
    expect(definition).toBeObject();
    expect(definition.entryPath).toBeString();
    expect(definition.entryPath.length).toBeGreaterThan(0);
  });
});

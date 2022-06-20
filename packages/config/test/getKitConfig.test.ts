import { getKitConfig } from "../src/getKitConfig";
import path from "path";

describe("getKitConfig()", () => {
  const currentWorkingDir = process.cwd();

  function fixturePath(): string {
    return path.join(currentWorkingDir, "test", "__fixtures__");
  }

  function packagePath(name: string): string {
    return path.join(fixturePath(), "node_modules", name);
  }

  afterEach(() => process.chdir(currentWorkingDir));

  test("returns undefined for an unconfigured package when using the current working directory", () => {
    process.chdir(packagePath("kit-test-unconfigured"));
    expect(getKitConfig()).toBeUndefined();
  });

  test("returns undefined for an unconfigured package when using an explicit working directory", () => {
    expect(
      getKitConfig({ cwd: packagePath("kit-test-unconfigured") })
    ).toBeUndefined();
  });

  test("returns undefined for an unconfigured package when using a module name", () => {
    expect(getKitConfig({ module: "kit-test-unconfigured" })).toBeUndefined();
  });

  test("returns rnx-kit configuration when using the current working directory", () => {
    process.chdir(packagePath("kit-test-configured"));
    expect(getKitConfig()).toMatchSnapshot();
  });

  test("returns rnx-kit configuration when using an explicit working directory", () => {
    expect(
      getKitConfig({ cwd: packagePath("kit-test-configured") })
    ).toMatchSnapshot();
  });

  test("returns rnx-kit configuration when using a module name", () => {
    expect(getKitConfig({ module: "kit-test-configured" })).toMatchSnapshot();
  });
});

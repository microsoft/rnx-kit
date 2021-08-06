import { getKitConfig } from "../src/getKitConfig";
import path from "path";

describe("getKitConfig()", () => {
  const notPresentFixture = "not-present";
  const inPackageFixture = "in-package";
  const inConfigFixture = "in-config-js";

  const currentWorkingDir = process.cwd();

  function fixturePath(name: string): string {
    return path.join(currentWorkingDir, "test", "__fixtures__", name);
  }

  /**
   * Sets current working directory to specified test fixture.
   * @param {string} name
   */
  function setFixture(name: string): void {
    process.chdir(fixturePath(name));
  }

  afterEach(() => process.chdir(currentWorkingDir));

  test("not-present package correctly returns a null config", () => {
    setFixture(notPresentFixture);
    expect(getKitConfig()).toBeNull();
  });

  test("kit options can be found in package.json", () => {
    setFixture(inPackageFixture);
    const config = getKitConfig();
    expect(config).not.toBeNull();
    expect(config && config.bundle).toBeTruthy();
    expect(config && config.platformBundle).toBeTruthy();
    expect(config).toMatchSnapshot();
  });

  test("kit options can be found in config file", () => {
    setFixture(inConfigFixture);
    const config = getKitConfig();
    expect(config).not.toBeNull();
    expect(config).toMatchSnapshot();
  });

  test("kit options can be loaded via path", () => {
    const config = getKitConfig({ cwd: fixturePath(inPackageFixture) });
    expect(config).toMatchSnapshot();
  });
});

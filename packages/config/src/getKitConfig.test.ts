// @ts-check
"use strict";

import { getKitConfig } from "./getKitConfig";
import path from "path";

describe("@rnx-kit/config tests", () => {
  const notPresentFixture = "not-present";
  //  const inPackageFixture = 'in-package';
  //  const inConfigFixture = 'in-config-js';

  const currentWorkingDir = process.cwd();

  function fixturePath(name: string): string {
    return path.join(currentWorkingDir, "__fixtures__", name);
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
});

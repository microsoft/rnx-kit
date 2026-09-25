import { equal } from "node:assert/strict";
import * as path from "node:path";
import { after, afterEach, before, describe, it } from "node:test";
import { getWorkspacesInfoSync } from "../src/index.ts";
import {
  defineRequire,
  setFixture,
  undefineRequire,
  unsetFixture,
} from "./helper.ts";

describe("isWorkspace", () => {
  before(defineRequire);

  afterEach(() => {
    unsetFixture();
  });

  after(undefineRequire);

  it("returns true for a package matching the workspace globs", () => {
    const root = setFixture("pnpm-with-settings");
    const info = getWorkspacesInfoSync();

    equal(info.isWorkspace(path.join(root, "packages", "conan")), true);
  });

  it("returns false for a package excluded by the workspace globs", () => {
    const root = setFixture("pnpm-with-settings");
    const info = getWorkspacesInfoSync();

    equal(info.isWorkspace(path.join(root, "packages", "t-800")), false);
  });

  it("agrees with `findPackagesSync()`", () => {
    const root = setFixture("pnpm-with-settings");
    const info = getWorkspacesInfoSync();
    const packages = info.findPackagesSync();

    equal(packages.length, 4);
    for (const name of ["conan", "dutch", "john", "quaid", "t-800"]) {
      const packageRoot = path.join(root, "packages", name);
      equal(
        info.isWorkspace(packageRoot),
        packages.includes(packageRoot),
        name
      );
    }
  });

  it("returns false for the workspace root", () => {
    const root = setFixture("pnpm-with-settings");
    const info = getWorkspacesInfoSync();

    equal(info.isWorkspace(root), false);
  });

  it("returns true for a package when there are no filters", () => {
    const root = setFixture("rush");
    const info = getWorkspacesInfoSync();

    equal(info.isWorkspace(path.join(root, "packages", "t-800")), true);
  });

  it("returns false for a non-package when there are no filters", () => {
    const root = setFixture("rush");
    const info = getWorkspacesInfoSync();

    equal(
      info.isWorkspace(path.join(root, "packages", "invalid-package")),
      false
    );
  });
});

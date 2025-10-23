import { equal } from "node:assert/strict";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { URL, fileURLToPath } from "node:url";
import { checkPackageManifest as checkPackageManifestActual } from "../../src/commands/check.ts";
import { defaultConfig } from "../../src/config.ts";
import * as mockfs from "../__mocks__/fs.ts";
import { defineRequire, undefineRequire } from "../helpers.ts";

const defaultOptions = {
  presets: defaultConfig.presets,
  loose: false,
  migrateConfig: false,
  noUnmanaged: false,
  verbose: false,
  write: true,
};

function checkPackageManifest(manifestPath: string) {
  return checkPackageManifestActual(
    manifestPath,
    defaultOptions,
    undefined,
    undefined,
    mockfs as unknown as typeof import("node:fs")
  );
}

function fixturePath(name: string) {
  return fileURLToPath(new URL(`../__fixtures__/${name}`, import.meta.url));
}

describe("checkPackageManifest({ kitType: 'app' })", () => {
  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  after(() => {
    undefineRequire();
  });

  it("fails if multiple profiles are returned", () => {
    const manifestPath = path.join(
      fixturePath("misconfigured-app"),
      "package.json"
    );

    const result = checkPackageManifest(manifestPath);

    equal(result, "invalid-app-requirements");
  });
});

describe("checkPackageManifest({ kitType: 'app' }) (backwards compatibility)", () => {
  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  after(() => {
    undefineRequire();
  });

  it("adds required dependencies", (t) => {
    const manifestPath = path.join(fixturePath("awesome-repo"), "package.json");

    let destination = "";
    let updatedManifest = "";
    mockfs.__setMockFileWriter((dest, content) => {
      destination = dest;
      updatedManifest = content;
    });

    equal(checkPackageManifest(manifestPath), "success");
    equal(destination, manifestPath);
    t.assert.snapshot?.(updatedManifest);
  });
});

import { equal, ok } from "node:assert/strict";
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

describe("checkPackageManifest({ kitType: 'app', why: true })", () => {
  before(() => {
    defineRequire("../../src/preset.ts", import.meta.url);
  });

  after(() => {
    undefineRequire();
  });

  it("explains which packages required each managed dependency", () => {
    const manifestPath = path.join(fixturePath("awesome-repo"), "package.json");

    const options = { ...defaultOptions, why: true, write: false };

    let message = "";
    const reporter = {
      info: () => undefined,
      warn: () => undefined,
      error: (msg: string) => {
        message = msg;
      },
      close: () => undefined,
    };

    const result = checkPackageManifestActual(
      manifestPath,
      options,
      undefined,
      reporter,
      mockfs as unknown as typeof import("node:fs")
    );

    equal(result, "unsatisfied");
    ok(
      message.includes(
        `      ├── dependencies["@react-native-community/netinfo"]: dependency is missing, expected "^9.0.0"\n` +
          `      │     └── required by 'dutch'`
      )
    );
    ok(
      message.includes(
        `      ├── dependencies["@react-native-async-storage/async-storage"]: dependency is missing, expected "^1.17.10"\n` +
          `      │     └── required by 'john'`
      )
    );
  });

  it("omits reasons when 'why' is not set", () => {
    const manifestPath = path.join(fixturePath("awesome-repo"), "package.json");

    const options = { ...defaultOptions, why: false, write: false };

    let message = "";
    const reporter = {
      info: () => undefined,
      warn: () => undefined,
      error: (msg: string) => {
        message = msg;
      },
      close: () => undefined,
    };

    const result = checkPackageManifestActual(
      manifestPath,
      options,
      undefined,
      reporter,
      mockfs as unknown as typeof import("node:fs")
    );

    equal(result, "unsatisfied");
    equal(message.includes("required by"), false);
  });
});

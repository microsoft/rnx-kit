import * as path from "node:path";
import { checkPackageManifest as checkPackageManifestActual } from "../src/commands/check";
import { defaultConfig } from "../src/config";

jest.unmock("@rnx-kit/config");

const defaultOptions = {
  presets: defaultConfig.presets,
  loose: false,
  migrateConfig: false,
  noUnmanaged: false,
  verbose: false,
  write: true,
};

function checkPackageManifest(manifestPath: string) {
  const fs = require("./__mocks__/fs.js");
  return checkPackageManifestActual(
    manifestPath,
    defaultOptions,
    undefined,
    undefined,
    fs
  );
}

function fixturePath(name: string) {
  return path.join(__dirname, "__fixtures__", name);
}

describe("checkPackageManifest({ kitType: 'app' })", () => {
  it("fails if multiple profiles are returned", () => {
    const manifestPath = path.join(
      fixturePath("misconfigured-app"),
      "package.json"
    );

    const result = checkPackageManifest(manifestPath);

    expect(result).toBe("invalid-app-requirements");
  });
});

describe("checkPackageManifest({ kitType: 'app' }) (backwards compatibility)", () => {
  const fs = require("./__mocks__/fs.js");

  afterAll(() => {
    jest.clearAllMocks();
  });

  it("adds required dependencies", () => {
    const manifestPath = path.join(fixturePath("awesome-repo"), "package.json");

    let destination = "";
    let updatedManifest = "";
    fs.__setMockFileWriter((dest, content) => {
      destination = dest;
      updatedManifest = content;
    });

    expect(checkPackageManifest(manifestPath)).toBe("success");
    expect(destination).toBe(manifestPath);
    expect(updatedManifest).toMatchSnapshot();
  });
});

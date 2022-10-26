import path from "path";
import { checkPackageManifest } from "../src/commands/check";
import { defaultConfig } from "../src/config";

jest.mock("fs");
jest.unmock("@rnx-kit/config");

function fixturePath(name: string) {
  return path.join(process.cwd(), "test", "__fixtures__", name);
}

describe("checkPackageManifest({ kitType: 'app' }) (backwards compatibility)", () => {
  const fs = require("fs");

  afterAll(() => {
    jest.clearAllMocks();
  });

  test("adds required dependencies", () => {
    const manifestPath = path.join(fixturePath("awesome-repo"), "package.json");

    let destination = "";
    let updatedManifest = "";
    fs.__setMockFileWriter((dest, content) => {
      destination = dest;
      updatedManifest = content;
    });

    expect(
      checkPackageManifest(manifestPath, {
        presets: defaultConfig.presets,
        loose: false,
        migrateConfig: false,
        verbose: false,
        write: true,
      })
    ).toBe("success");
    expect(destination).toBe(manifestPath);
    expect(updatedManifest).toMatchSnapshot();
  });
});

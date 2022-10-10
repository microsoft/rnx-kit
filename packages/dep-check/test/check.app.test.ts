import path from "path";
import { checkPackageManifest } from "../src/check";

jest.mock("fs");
jest.unmock("@rnx-kit/config");

function fixturePath(name: string) {
  return path.join(process.cwd(), "test", "__fixtures__", name);
}

describe("checkPackageManifest({ kitType: 'app' })", () => {
  const fs = require("fs");
  const consoleWarnSpy = jest.spyOn(global.console, "warn");

  beforeEach(() => {
    consoleWarnSpy.mockReset();
  });

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
      checkPackageManifest(manifestPath, { loose: false, write: true })
    ).toBe(0);
    expect(consoleWarnSpy).not.toBeCalled();
    expect(destination).toBe(manifestPath);
    expect(updatedManifest).toMatchSnapshot();
  });
});

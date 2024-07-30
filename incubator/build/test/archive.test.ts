import { deepEqual, equal } from "node:assert/strict";
import * as fs from "node:fs";
import { afterEach, describe, it } from "node:test";
import { URL, fileURLToPath } from "node:url";
import { extract, untar, unzip } from "../src/archive";

function fixturePath(artifact: string): string {
  const url = new URL(`__fixtures__/${artifact}`, import.meta.url);
  return fileURLToPath(url);
}

function find(
  dir: string,
  prefix = dir.length,
  result: string[] = []
): string[] {
  const root = dir.substring(prefix);
  fs.readdirSync(dir, { withFileTypes: true }).forEach((file) => {
    result.push(`${root}/${file.name}`);
    if (file.isDirectory()) {
      find(`${dir}/${file.name}`, prefix, result);
    }
  });
  return result;
}

describe("archive", () => {
  const MACOS_ARTIFACT_APP = fixturePath("ReactTestApp.app/");
  const MACOS_ARTIFACT_TAR = fixturePath("macos-artifact.tar");
  const MACOS_ARTIFACT_ZIP = fixturePath("macos-artifact.zip");

  const MACOS_ARTIFACT_APP_LISTING = [
    "/Contents",
    "/Contents/Info.plist",
    "/Contents/MacOS",
    "/Contents/MacOS/ReactTestApp",
    "/Contents/PkgInfo",
    "/Contents/Resources",
    "/Contents/Resources/AccessibilityResources.bundle",
    "/Contents/Resources/AccessibilityResources.bundle/Contents",
    "/Contents/Resources/AccessibilityResources.bundle/Contents/Info.plist",
    "/Contents/Resources/AccessibilityResources.bundle/Contents/Resources",
    "/Contents/Resources/AccessibilityResources.bundle/Contents/Resources/en.lproj",
    "/Contents/Resources/AccessibilityResources.bundle/Contents/Resources/en.lproj/Localizable.strings",
    "/Contents/Resources/Assets.car",
    "/Contents/Resources/Base.lproj",
    "/Contents/Resources/Base.lproj/Main.storyboardc",
    "/Contents/Resources/Base.lproj/Main.storyboardc/Info.plist",
    "/Contents/Resources/Base.lproj/Main.storyboardc/MainMenu.nib",
    "/Contents/Resources/Base.lproj/Main.storyboardc/NSWindowController-B8D-0N-5wS.nib",
    "/Contents/Resources/Base.lproj/Main.storyboardc/XfG-lQ-9wD-view-m2S-Jp-Qdl.nib",
    "/Contents/Resources/app.json",
    "/Contents/Resources/en.lproj",
    "/Contents/Resources/en.lproj/Main.strings",
  ];

  afterEach(() => {
    [MACOS_ARTIFACT_APP, MACOS_ARTIFACT_TAR].forEach((file) => {
      try {
        fs.rmSync(file, { maxRetries: 3, recursive: true });
      } catch (_) {
        // noop
      }
    });
  });

  it("extracts tar/zip archives", async () => {
    equal(await extract(MACOS_ARTIFACT_ZIP), MACOS_ARTIFACT_TAR);
    equal(await untar(MACOS_ARTIFACT_TAR), MACOS_ARTIFACT_APP);
    deepEqual(find(MACOS_ARTIFACT_APP).sort(), MACOS_ARTIFACT_APP_LISTING);
  });

  it(
    "extracts zip archives with unzip",
    { skip: process.platform !== "darwin" },
    async () => {
      equal(await unzip(MACOS_ARTIFACT_ZIP), MACOS_ARTIFACT_TAR);
      equal(await untar(MACOS_ARTIFACT_TAR), MACOS_ARTIFACT_APP);
      deepEqual(find(MACOS_ARTIFACT_APP).sort(), MACOS_ARTIFACT_APP_LISTING);
    }
  );
});

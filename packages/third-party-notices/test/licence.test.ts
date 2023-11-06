import path from "path";
import { createLicenseJSON } from "../src/output/json";
import { createLicenseFileContents } from "../src/output/text";
import type { License } from "../src/types";
import { extractLicenses } from "../src/write-third-party-notices";

const rnxConsoleDir = path.dirname(
  require.resolve("@rnx-kit/console/package.json")
);
const yargsDir = path.dirname(require.resolve("yargs/package.json"));

async function getSampleLicenseData(): Promise<License[]> {
  const map = new Map([
    // License data in package.json
    ["@rnx-kit/console", rnxConsoleDir],
    // License data package.json and LICENCE file
    ["yargs", yargsDir],
  ]);

  const licenses = await extractLicenses(map);

  // Hack versions to not depend on
  for (const license of licenses) {
    license.version = "1.2.3-fixedVersionForTesting";
  }

  // Private packages should be excluded from text output
  licenses.push({
    name: "private-package",
    version: "1.0.0",
    license: "Unlicensed",
    licenseURLs: [],
    path: ".",
  });

  return licenses;
}

describe("license", () => {
  test("extractLicenses", async () => {
    const licenses = await getSampleLicenseData();

    expect(licenses).toEqual([
      {
        license: "MIT",
        licenseURLs: ["https://spdx.org/licenses/MIT.html"],
        name: "@rnx-kit/console",
        path: rnxConsoleDir,
        version: "1.2.3-fixedVersionForTesting",
      },
      {
        license: "MIT",
        licenseFile: "LICENSE",
        licenseText: expect.stringMatching(/^MIT License/),
        licenseURLs: ["https://spdx.org/licenses/MIT.html"],
        name: "yargs",
        path: yargsDir,
        version: "1.2.3-fixedVersionForTesting",
      },
      {
        license: "Unlicensed",
        licenseURLs: [],
        name: "private-package",
        path: ".",
        version: "1.0.0",
      },
    ]);
  });

  test("createLicenseFileContents", async () => {
    const licenses = await getSampleLicenseData();

    const licenseText = createLicenseFileContents(licenses);

    expect(licenseText).toMatchSnapshot();
  });

  test("createLicenseFileContentsWithWrappers", async () => {
    const licenses = await getSampleLicenseData();

    const licenseText = createLicenseFileContents(
      licenses,
      ["preamble 1\n2\r\n3\r4", "Preamble 2"],
      ["additional 1\n2\r\n3\r4", "additional 2"]
    );

    expect(licenseText).toMatchSnapshot();
  });

  test("createLicenseJSON", async () => {
    const licenses = await getSampleLicenseData();

    const licenseText = createLicenseJSON(licenses);

    expect(JSON.parse(licenseText)).toEqual({
      packages: [
        {
          copyright: "No copyright notice",
          license: "MIT",
          name: "@rnx-kit/console",
          version: "1.2.3-fixedVersionForTesting",
        },
        {
          copyright:
            "Copyright 2010 James Halliday (mail@substack.net); Modified work Copyright 2014 Contributors (ben@npmjs.com)",
          license: "MIT",
          name: "yargs",
          version: "1.2.3-fixedVersionForTesting",
        },
        {
          copyright: "No copyright notice",
          license: "Unlicensed",
          name: "private-package",
          version: "1.0.0",
        },
      ],
    });
  });
});

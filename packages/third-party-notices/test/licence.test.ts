import path from "path";
import { createLicenseJSON } from "../src/output/json";
import { createLicenseFileContents } from "../src/output/text";
import type { License } from "../src/types";
import { extractLicenses } from "../src/write-third-party-notices";

async function getSampleLicenseData(): Promise<License[]> {
  const map = new Map([
    // License data in package.json
    [
      "@rnx-kit/console",
      path.dirname(require.resolve("@rnx-kit/console/package.json")),
    ],
    // License data package.json and LICENCE file
    ["yargs", path.dirname(require.resolve("yargs/package.json"))],
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

    // normalize the paths for stable and cross platform snapshots
    for (const license of licenses) {
      license.path = license.path
        .replace(path.resolve(__dirname, "../../.."), "~")
        .replace(/[/\\]/g, "/");
    }

    expect(licenses).toMatchSnapshot();
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

    expect(JSON.parse(licenseText)).toMatchSnapshot();
  });
});

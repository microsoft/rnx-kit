import path from "path";
import { createLicenseJSON } from "../src/output/json";
import { createLicenseFileContents } from "../src/output/text";
import type { License } from "../src/types";
import { extractLicenses } from "../src/write-third-party-notices";

async function getSampleLicenseData(): Promise<License[]> {
  const map = new Map();
  // License data in package.json
  map.set("@rnx-kit/cli", path.resolve("../../node_modules/@rnx-kit/cli"));
  // License data package.json and LICENCE file
  map.set("react-native", path.resolve("../../node_modules/react-native"));
  // License data package.json and LICENSE file
  map.set("react", path.resolve("../../node_modules/react"));

  const licenses = await extractLicenses(map);

  // Hack versions to not depend on
  for (const license of licenses) {
    license.version = "1.2.3-fixedVersionForTesting";
  }

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

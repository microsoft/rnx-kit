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
          copyright: "Microsoft Open Source",
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
          copyright: "Microsoft Open Source",
          license: "Unlicensed",
          name: "private-package",
          version: "1.0.0",
        },
      ],
    });
  });

  test("createLicenseJSON with fullLicenseText", async () => {
    const licenses = await getSampleLicenseData();
    // escape \n so JSON.parse won't transform \n into actual newlines
    const licenseText = createLicenseJSON(licenses, true).replace(
      /\\n/g,
      "\\\\n"
    );

    expect(JSON.parse(licenseText)).toEqual({
      packages: [
        {
          copyright: "Microsoft Open Source",
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
          text: 'MIT License\\n\\nCopyright 2010 James Halliday (mail@substack.net); Modified work Copyright 2014 Contributors (ben@npmjs.com)\\n\\nPermission is hereby granted, free of charge, to any person obtaining a copy\\nof this software and associated documentation files (the "Software"), to deal\\nin the Software without restriction, including without limitation the rights\\nto use, copy, modify, merge, publish, distribute, sublicense, and/or sell\\ncopies of the Software, and to permit persons to whom the Software is\\nfurnished to do so, subject to the following conditions:\\n\\nThe above copyright notice and this permission notice shall be included in\\nall copies or substantial portions of the Software.\\n\\nTHE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR\\nIMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,\\nFITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE\\nAUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER\\nLIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,\\nOUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN\\nTHE SOFTWARE.',
        },
        {
          copyright: "Microsoft Open Source",
          license: "Unlicensed",
          name: "private-package",
          version: "1.0.0",
        },
      ],
    });
  });
});

import { deepEqual } from "node:assert/strict";
import * as fs from "node:fs";
import { createRequire } from "node:module";
import * as path from "node:path";
import { after, before, describe, it } from "node:test";
import { URL } from "node:url";
import { createLicenseJSON } from "../src/output/json.ts";
import { createLicenseFileContents } from "../src/output/text.ts";
import type { License } from "../src/types.ts";
import { extractLicenses } from "../src/write-third-party-notices.ts";

describe("license", () => {
  const require = createRequire(
    new URL("../src/write-third-party-notices.ts", import.meta.url)
  );

  function resolveModule(moduleName: string): string {
    return path.dirname(require.resolve(`${moduleName}/package.json`));
  }

  const rnxConsoleDir = resolveModule("@rnx-kit/console");
  const metroSourceMapDir = resolveModule("metro-source-map");
  const yargsDir = resolveModule("yargs");

  async function getSampleLicenseData(): Promise<License[]> {
    const map = new Map([
      // License data in package.json
      ["@rnx-kit/console", rnxConsoleDir],
      // License data package.json and LICENCE file
      ["yargs", yargsDir],
      // No license data
      ["metro-source-map", metroSourceMapDir],
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

  before(() => {
    global.require = require;
  });

  after(() => {
    global.require = undefined;
  });

  it("extractLicenses", async () => {
    const licenses = await getSampleLicenseData();

    deepEqual(licenses, [
      {
        license: "MIT",
        licenseURLs: ["https://spdx.org/licenses/MIT.html"],
        name: "@rnx-kit/console",
        path: rnxConsoleDir,
        version: "1.2.3-fixedVersionForTesting",
      },
      {
        name: "metro-source-map",
        path: metroSourceMapDir,
        version: "1.2.3-fixedVersionForTesting",
        licenseURLs: ["https://spdx.org/licenses/MIT.html"],
        license: "MIT",
      },
      {
        license: "MIT",
        licenseFile: "LICENSE",
        licenseText: fs.readFileSync(path.join(yargsDir, "LICENSE"), {
          encoding: "utf-8",
        }),
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

  it("createLicenseFileContents", async (t) => {
    const licenses = await getSampleLicenseData();
    const licenseText = createLicenseFileContents(licenses);

    t.assert.snapshot?.(licenseText);
  });

  it("createLicenseFileContentsWithWrappers", async (t) => {
    const licenses = await getSampleLicenseData();

    const licenseText = createLicenseFileContents(
      licenses,
      ["preamble 1\n2\r\n3\r4", "Preamble 2"],
      ["additional 1\n2\r\n3\r4", "additional 2"]
    );

    t.assert.snapshot?.(licenseText);
  });

  it("createLicenseJSON", async () => {
    const licenses = await getSampleLicenseData();

    const licenseText = createLicenseJSON(licenses);

    deepEqual(JSON.parse(licenseText), {
      packages: [
        {
          copyright: "Microsoft Open Source",
          license: "MIT",
          name: "@rnx-kit/console",
          version: "1.2.3-fixedVersionForTesting",
        },
        {
          name: "metro-source-map",
          version: "1.2.3-fixedVersionForTesting",
          license: "MIT",
          copyright: "MIT (https://spdx.org/licenses/MIT.html)",
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

  it("createLicenseJSON with fullLicenseText", async () => {
    const licenses = await getSampleLicenseData();
    // escape \n so JSON.parse won't transform \n into actual newlines
    const licenseText = createLicenseJSON(licenses, true).replace(
      /\\n/g,
      "\\\\n"
    );

    deepEqual(JSON.parse(licenseText), {
      packages: [
        {
          copyright: "Microsoft Open Source",
          license: "MIT",
          name: "@rnx-kit/console",
          version: "1.2.3-fixedVersionForTesting",
        },
        {
          name: "metro-source-map",
          version: "1.2.3-fixedVersionForTesting",
          license: "MIT",
          copyright: "MIT (https://spdx.org/licenses/MIT.html)",
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

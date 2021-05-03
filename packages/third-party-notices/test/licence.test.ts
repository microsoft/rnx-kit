import {
  extractLicences,
  createLicenceFileContents,
  ILicense,
} from "../src/write-third-party-notices";

import os from "os";
import path from "path";

async function getSampleLicenceData(): Promise<{
  licences: ILicense[];
  map: Map<string, string>;
}> {
  const map = new Map();
  // Licence data in package.json
  map.set("@rnx-kit/cli", path.resolve("../../node_modules/@rnx-kit/cli"));
  // Licence data package.json and LICENCE file
  map.set(
    "console-browserify",
    path.resolve("../../node_modules/console-browserify")
  );

  const licences = await extractLicences(map);

  // Hack versions to not depend on
  for (let licence of licences) {
    licence.version = "1.2.3-fixedVersionForTesting";
  }

  return { licences, map };
}

describe("licence", () => {
  test("extractLicences", async () => {
    const { licences } = await getSampleLicenceData();

    expect(licences).toMatchInlineSnapshot(
      os.platform() == "win32" ? snapShotExtractLicences_Win32 : snapShotExtractLicences,
    );
  });

  test("createLicenceFileContents", async () => {
    const { licences, map } = await getSampleLicenceData();

    const licenceText = createLicenceFileContents(map, licences);

    expect(licenceText).toMatchInlineSnapshot(
      os.platform() == "win32" ? snapShotCreateLicenceFileContents_Win32 : snapShotCreateLicenceFileContents

    );
  });

  test("createLicenceFileContentsWithWrappers", async () => {
    const { licences, map } = await getSampleLicenceData();

    const licenceText = createLicenceFileContents(
      map,
      licences,
      ["preamble 1\n2\r\n3\r4", "Preamble 2"],
      ["additional 1\n2\r\n3\r4", "additional 2"]
    );

    expect(licenceText).toMatchSnapshot();
  });
});

const snapShotExtractLicences_Win32 =
  `
  Array [
    Object {
      "license": "MIT",
      "licenseURLs": Array [
        "https://spdx.org/licenses/MIT.html",
      ],
      "name": "@rnx-kit/cli",
      "path": "Z:\\\\src\\\\rnx-kit\\\\node_modules\\\\@rnx-kit\\\\cli",
      "version": "1.2.3-fixedVersionForTesting",
    },
    Object {
      "license": "MIT",
      "licenseFile": "LICENCE",
      "licenseText": "Copyright (c) 2012 Raynos.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the \\"Software\\"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED \\"AS IS\\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.",
      "licenseURLs": Array [
        "http://github.com/browserify/console-browserify/raw/master/LICENSE",
      ],
      "name": "console-browserify",
      "path": "Z:\\\\src\\\\rnx-kit\\\\node_modules\\\\console-browserify",
      "version": "1.2.3-fixedVersionForTesting",
    },
  ]
  `;

const snapShotExtractLicences =
  `
  Array [
    Object {
      "license": "MIT",
      "licenseURLs": Array [
        "https://spdx.org/licenses/MIT.html",
      ],
      "name": "@rnx-kit/cli",
      "path": "/mnt/z/src/rnx-kit/node_modules/@rnx-kit/cli",
      "version": "1.2.3-fixedVersionForTesting",
    },
    Object {
      "license": "MIT",
      "licenseFile": "LICENCE",
      "licenseText": "Copyright (c) 2012 Raynos.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the \\"Software\\"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED \\"AS IS\\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.",
      "licenseURLs": Array [
        "http://github.com/browserify/console-browserify/raw/master/LICENSE",
      ],
      "name": "console-browserify",
      "path": "/mnt/z/src/rnx-kit/node_modules/console-browserify",
      "version": "1.2.3-fixedVersionForTesting",
    },
  ]
  `

const snapShotCreateLicenceFileContents_Win32 =
  `
  "================================================
  @rnx-kit/cli 1.2.3-fixedVersionForTesting
  =====
  MIT (https://spdx.org/licenses/MIT.html)
  ================================================

  ================================================
  console-browserify 1.2.3-fixedVersionForTesting
  =====
  Copyright (c) 2012 Raynos.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the \\"Software\\"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED \\"AS IS\\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
  ================================================

  "
  `;

const snapShotCreateLicenceFileContents =
  `
  "================================================
  @rnx-kit/cli 1.2.3-fixedVersionForTesting
  =====
  MIT (https://spdx.org/licenses/MIT.html)
  ================================================

  ================================================
  console-browserify 1.2.3-fixedVersionForTesting
  =====
  Copyright (c) 2012 Raynos.

  Permission is hereby granted, free of charge, to any person obtaining a copy
  of this software and associated documentation files (the \\"Software\\"), to deal
  in the Software without restriction, including without limitation the rights
  to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  copies of the Software, and to permit persons to whom the Software is
  furnished to do so, subject to the following conditions:

  The above copyright notice and this permission notice shall be included in
  all copies or substantial portions of the Software.

  THE SOFTWARE IS PROVIDED \\"AS IS\\", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
  IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
  FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
  AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
  LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
  OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
  THE SOFTWARE.
  ================================================

  "
  `
import { findPackage, readPackage } from "@rnx-kit/tools-node/package";
import type { License, LicenseJSONInfo } from "../types";

function getPackageAuthor(modulePath: string): string | undefined {
  const pkgFile = findPackage(modulePath);
  if (pkgFile) {
    const manifest = readPackage(pkgFile);
    if (manifest) {
      return typeof manifest.author === "string"
        ? manifest.author
        : manifest.author?.name;
    }
  }
  return undefined;
}

function parseCopyright(
  modulePath: string,
  licenseText: string | undefined
): string {
  const m = licenseText?.match(/^Copyright .*$/m);
  if (!m) {
    return getPackageAuthor(modulePath) || "No copyright notice";
  }

  return m[0].trim();
}

export function createLicenseJSON(
  licenses: License[],
  fullLicenseText?: boolean
): string {
  return JSON.stringify(
    {
      packages: licenses.map(
        ({ name, path: modulePath, version, license, licenseText }) => {
          if (!license) {
            throw new Error(`No license for ${name}`);
          }
          const info: LicenseJSONInfo = {
            name,
            version,
            license,
            copyright: parseCopyright(modulePath, licenseText),
          };

          if (fullLicenseText) {
            info.text = licenseText?.replace(/\r\n|\r|\n/g, "\n").trim();
          }

          return info;
        }
      ),
    },
    null,
    2
  );
}

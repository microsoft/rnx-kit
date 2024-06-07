import type { License, LicenseJSONInfo } from "../types";
import { parseCopyright } from "./copyright";

export function createLicenseJSON(
  licenses: License[],
  fullLicenseText?: boolean
): string {
  return JSON.stringify(
    {
      packages: licenses.map(
        ({
          name,
          path: modulePath,
          version,
          license,
          licenseText,
          licenseURLs,
        }) => {
          if (!license) {
            throw new Error(
              `No license information found for package '${name}'. Consider filing an issue for the project to properly advertise its licence. Pass this module to the tool via '--ignoreModules ${name}' to suppress this message.`
            );
          }
          const info: LicenseJSONInfo = {
            name,
            version,
            license,
            copyright: parseCopyright(
              modulePath,
              licenseText,
              license,
              licenseURLs
            ),
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

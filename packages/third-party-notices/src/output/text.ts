import type { License } from "../types";
import { getPackageAuthor } from "./copyright";

const EOL = "\n";
const SEPARATOR = `${EOL}${EOL}========================================================================${EOL}${EOL}`;

function getLicenseText({
  name,
  license,
  licenseText,
  licenseURLs,
  path: modulePath,
}: License): string {
  if (!licenseText) {
    if (!license && (!licenseURLs || licenseURLs.length === 0)) {
      throw new Error(
        `No license information found for package '${name}'. Consider filing an issue for the project to properly advertise its licence. Pass this module to the tool via '--ignoreModules ${name}' to suppress this message.`
      );
    }

    const copyright = getPackageAuthor(modulePath);
    if (copyright) {
      return `Copyright ${copyright}; licensed under ${license} (${licenseURLs.join(" ")})`;
    } else {
      return `Licensed under ${license} (${licenseURLs.join(" ")})`;
    }
  }
  return licenseText;
}

export function createLicenseFileContents(
  licenses: License[],
  preambleText?: string[],
  additionalText?: string[]
): string {
  const output = preambleText ? [preambleText.join(EOL)] : [];

  // Emit combined license text
  for (const license of licenses) {
    if (license.license?.toUpperCase() === "UNLICENSED") {
      // Ignore unlicensed/private packages
      continue;
    }

    const { name, version } = license;
    const trimmedText = getLicenseText(license)
      .replace(/\r\n|\r|\n/g, EOL)
      .trim();
    output.push(`${name} ${version}${EOL}--${EOL}${trimmedText}`);
  }

  if (additionalText) {
    output.push(additionalText.join(EOL));
  }

  // Always add a newline at the end
  return output.join(SEPARATOR) + EOL;
}

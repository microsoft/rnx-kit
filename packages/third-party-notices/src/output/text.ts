import type { License } from "../types";

const EOL = "\n";
const SEPARATOR = `${EOL}${EOL}========================================================================${EOL}${EOL}`;

export function createLicenseFileContents(
  licenses: License[],
  preambleText?: string[],
  additionalText?: string[]
): string {
  const output = preambleText ? [preambleText.join(EOL)] : [];

  // Emit combined license text
  licenses.forEach(({ name, version, license, licenseText, licenseURLs }) => {
    if (license?.toUpperCase() === "UNLICENSED") {
      // Ignore unlicensed/private packages
      return;
    }

    if (!licenseText) {
      if (!license && (!licenseURLs || licenseURLs.length === 0)) {
        throw new Error(
          `No license information found for package '${name}'. Consider filing an issue for the project to properly advertise its licence. Pass this module to the tool via '--ignoreModules ${name}' to suppress this message.`
        );
      }
      licenseText = `${license} (${licenseURLs.join(" ")})`;
    }

    const trimmedText = licenseText.replace(/\r\n|\r|\n/g, EOL).trim();
    output.push(`${name} ${version}${EOL}--${EOL}${trimmedText}`);
  });

  if (additionalText) {
    output.push(additionalText.join(EOL));
  }

  // Always add a newline at the end
  return output.join(SEPARATOR) + EOL;
}

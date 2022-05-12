import os from "os";
import type { License } from "../types";

export function createLicenseFileContents(
  licenses: License[],
  preambleText?: string[],
  additionalText?: string[]
): string {
  let outputText = "";

  const writeLine = (s: string): void => {
    outputText += `${s || ""}${os.EOL}`;
  };

  const writeMultipleLines = (s: string): void => {
    const lines = s.split(/\r\n|\r|\n/g);
    lines.forEach((line: string) => {
      writeLine(line);
    });
  };

  if (preambleText) {
    writeMultipleLines(preambleText.join(os.EOL));
  }

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
    writeLine("================================================");
    writeLine(`${name} ${version}`);
    writeLine("--");
    writeMultipleLines(licenseText.trim());
    writeLine("================================================");
    writeLine("");
  });

  if (additionalText) {
    writeMultipleLines(additionalText.join(os.EOL));
  }

  return outputText;
}

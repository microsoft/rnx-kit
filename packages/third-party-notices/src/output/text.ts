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
    if (!licenseText) {
      if (!license && (!licenseURLs || licenseURLs.length === 0)) {
        throw new Error(`No license text or URL for ${name}`);
      }
      licenseText = `${license} (${licenseURLs.join(" ")})`;
    }
    writeLine("================================================");
    writeLine(`${name} ${version}`);
    writeLine("=====");
    writeMultipleLines(licenseText.trim());
    writeLine("================================================");
    writeLine("");
  });

  if (additionalText) {
    writeMultipleLines(additionalText.join(os.EOL));
  }

  return outputText;
}

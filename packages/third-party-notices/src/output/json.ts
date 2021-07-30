import fs from "fs";
import path from "path";
import type { License } from "../types";

function getPackageAuthor(modulePath: string): string | undefined {
  const packageJson = path.join(modulePath, "package.json");
  const manifest = fs.readFileSync(packageJson, { encoding: "utf-8" });
  const { author } = JSON.parse(manifest);
  return typeof author === "string" ? author : author?.name;
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

export function createLicenseJSON(licenses: License[]): string {
  return JSON.stringify({
    packages: licenses.map(
      ({ name, path: modulePath, version, license, licenseText }) => {
        if (!license) {
          throw new Error(`No license for ${name}`);
        }
        return {
          name,
          version,
          license,
          copyright: parseCopyright(modulePath, licenseText),
        };
      }
    ),
  });
}

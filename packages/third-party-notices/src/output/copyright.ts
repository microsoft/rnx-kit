import { findPackage, readPackage } from "@rnx-kit/tools-node/package";

export function getPackageAuthor(modulePath: string): string | undefined {
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

export function parseCopyright(
  modulePath: string,
  licenseText: string | undefined,
  license: string | undefined,
  licenseURLs: string[]
): string {
  const m = licenseText?.match(/^Copyright .*$/m);
  if (!m) {
    const packageAuthor = getPackageAuthor(modulePath);
    if (packageAuthor) {
      return packageAuthor;
    }

    if (licenseURLs?.length > 0) {
      return `${license} (${licenseURLs.join(" ")})`;
    }

    return "No copyright notice";
  }

  return m[0].trim();
}

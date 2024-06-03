export function latestVersion(versions: string[]): string {
  let latestVersion = "0.0.0";
  let maxValue = 0;

  for (const version of versions) {
    const [major, minor, patch] = version.split(".");
    const value = Number(major) * 10000 + Number(minor) * 100 + Number(patch);
    if (maxValue < value) {
      latestVersion = version;
      maxValue = value;
    }
  }

  return latestVersion;
}

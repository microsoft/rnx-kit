export function latestVersion(versions: string[]): string {
  let latestVersion = "0.0.0";
  let maxValue = 0;

  for (const version of versions) {
    const [major, minor, patch] = version.split(".");
    const value =
      parseInt(major, 10) * 10000 +
      parseInt(minor, 10) * 100 +
      parseInt(patch, 10);
    if (maxValue < value) {
      latestVersion = version;
      maxValue = value;
    }
  }

  return latestVersion;
}

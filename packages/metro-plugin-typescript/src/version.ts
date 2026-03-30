function versionNumber(version: string): number {
  const [major, minor = 0, patch = 0] = version.split("-")[0].split(".");
  return Number(major) * 1000000 + Number(minor) * 1000 + Number(patch);
}

export function greaterThanOrEqualTo(lhs: string, rhs: string): boolean {
  return versionNumber(lhs) >= versionNumber(rhs);
}

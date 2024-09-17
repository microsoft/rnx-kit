import { getMetroVersion } from "@rnx-kit/tools-react-native/metro";

export function v(version: string): number {
  const [major, minor = 0, patch = 0] = version.split("-")[0].split(".");
  return Number(major) * 1000000 + Number(minor) * 1000 + Number(patch);
}

export function assertVersion(requiredVersion: string): void {
  const version = getMetroVersion();
  if (!version) {
    throw new Error(`Metro version >=${requiredVersion} is required`);
  }

  if (v(version) < v(requiredVersion)) {
    throw new Error(
      `Metro version >=${requiredVersion} is required; got ${version}`
    );
  }
}

import * as fs from "node:fs";

function v(version: string): number {
  const [major, minor = 0, patch = 0] = version.split("-")[0].split(".");
  return Number(major) * 1000000 + Number(minor) * 1000 + Number(patch);
}

/**
 * Infers the appropriate esbuild target string for the installed version of
 * React Native / Hermes.
 *
 * The Hermes target was introduced in esbuild 0.14.49 and is updated as new
 * Hermes versions ship. It ensures that esbuild emits code that is compatible
 * with the Hermes JS engine used by the given React Native version.
 *
 * @param projectRoot Directory from which to resolve `react-native`.
 *   Defaults to `process.cwd()`.
 * @returns An esbuild target string such as `"hermes0.12"`.
 */
export function inferBuildTarget(projectRoot = process.cwd()): string {
  try {
    const options = { paths: [projectRoot] };
    const react = require.resolve("react-native/package.json", options);
    const manifest = fs.readFileSync(react, { encoding: "utf-8" });
    const { version } = JSON.parse(manifest);
    const versionNum = v(version);

    if (versionNum >= v("0.83.0")) {
      return "hermes0.14";
    } else if (versionNum >= v("0.75.0")) {
      return "hermes0.13";
    } else if (versionNum >= v("0.71.0")) {
      return "hermes0.12";
    } else if (versionNum >= v("0.68.0")) {
      return "hermes0.11";
    } else if (versionNum >= v("0.67.0")) {
      return "hermes0.10";
    } else if (versionNum >= v("0.66.0")) {
      return "hermes0.9";
    } else if (versionNum >= v("0.65.0")) {
      return "hermes0.8";
    }
  } catch (_) {
    // ignore
  }
  return "hermes0.7";
}

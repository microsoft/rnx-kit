import * as fs from "node:fs";
import { resolveFrom } from "./resolve";

export function findCommunityCliPluginPath(
  projectRoot = process.cwd(),
  rnDir = resolveFrom("react-native", projectRoot)
): string | undefined {
  if (!rnDir) {
    return undefined;
  }

  const pkg = fs.readFileSync(`${rnDir}/package.json`, { encoding: "utf-8" });
  if (!pkg.includes("@react-native/community-cli-plugin")) {
    return undefined;
  }

  return resolveFrom("@react-native/community-cli-plugin", rnDir);
}

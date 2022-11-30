import { isFileModuleRef, parseModuleRef } from "@rnx-kit/tools-node";
import { getAvailablePlatforms } from "@rnx-kit/tools-react-native";
import * as path from "path";
import { resolveFrom } from "./helper";
import type { ModuleResolver } from "./types";

export const remapReactNativeModule: ModuleResolver = (
  _context,
  moduleName,
  platform
) => {
  const platformImpl = getAvailablePlatforms()[platform];
  if (platformImpl) {
    if (moduleName === "react-native") {
      return platformImpl;
    } else if (moduleName.startsWith("react-native/")) {
      return `${platformImpl}/${moduleName.slice("react-native/".length)}`;
    }
  }
  return moduleName;
};

export const resolveModulePath: ModuleResolver = (
  { extraNodeModules, originModulePath },
  moduleName,
  _platform
) => {
  // Performance: Assume relative links are not going to hit symlinks
  const ref = parseModuleRef(moduleName);
  if (isFileModuleRef(ref)) {
    return moduleName;
  }

  const pkgName = ref.scope ? `${ref.scope}/${ref.name}` : ref.name;
  const pkgRoot =
    extraNodeModules?.[pkgName] ?? resolveFrom(pkgName, originModulePath);
  if (!pkgRoot) {
    return moduleName;
  }

  const replaced = moduleName.replace(pkgName, pkgRoot);
  const relativePath = path.relative(path.dirname(originModulePath), replaced);
  return relativePath.startsWith(".")
    ? relativePath
    : `.${path.sep}${relativePath}`;
};

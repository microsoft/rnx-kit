import { normalizePath } from "@rnx-kit/tools-node";
import path from "path";

type MetroResolver = typeof import("metro-resolver").resolve;

type Options = {
  remapModule?: (moduleName: string, platform: string) => string;
};

function resolveFrom(moduleName: string, startDir: string): string {
  return require.resolve(moduleName, { paths: [startDir] });
}

/**
 * Get `metro-resolver` from the cli to avoid adding another dependency that
 * needs to be kept in sync.
 */
export function getMetroResolver(fromDir = process.cwd()): MetroResolver {
  try {
    const rnPath = path.dirname(
      resolveFrom("react-native/package.json", fromDir)
    );
    const rncliPath = path.dirname(
      resolveFrom("@react-native-community/cli/package.json", rnPath)
    );
    const metroResolverPath = resolveFrom("metro-resolver", rncliPath);
    return require(metroResolverPath).resolve;
  } catch (_) {
    throw new Error(
      "Cannot find module 'metro-resolver'. This probably means that '@rnx-kit/metro-resolver-symlinks' is not compatible with the version of 'metro' that you are currently using. Please update to the latest version and try again. If the issue still persists after the update, please file a bug at https://github.com/microsoft/rnx-kit/issues."
    );
  }
}

export function getPackageName(moduleName: string): string {
  return moduleName
    .split("/")
    .slice(0, moduleName.startsWith("@") ? 2 : 1)
    .join("/");
}

export function isRelativeModule(moduleName: string): boolean {
  return moduleName.startsWith(".");
}

export function remapReactNativeModule(
  moduleName: string,
  platform: string,
  platformImplementations: Record<string, string>
): string {
  const platformImpl = platformImplementations[platform];
  if (platformImpl) {
    if (moduleName === "react-native") {
      return platformImpl;
    } else if (moduleName.startsWith("react-native/")) {
      return `${platformImpl}/${moduleName.slice("react-native/".length)}`;
    }
  }
  return moduleName;
}

export function resolveModulePath(
  moduleName: string,
  originModulePath: string
): string {
  // Performance: Assume relative links are not going to hit symlinks
  if (isRelativeModule(moduleName) || path.isAbsolute(moduleName)) {
    return moduleName;
  }

  const pkgName = getPackageName(moduleName);
  const pkgRoot = path.dirname(
    resolveFrom(path.join(pkgName, "package.json"), originModulePath)
  );
  const replaced = moduleName.replace(pkgName, pkgRoot);
  return path.relative(path.dirname(originModulePath), replaced);
}

export default function makeResolver({
  remapModule = (moduleName, _) => moduleName,
}: Options): MetroResolver {
  const resolve = getMetroResolver();

  // TODO: Read available platforms from `react-native config`.
  const availablePlatforms = {
    macos: "react-native-macos",
    win32: "@office-iss/react-native-win32",
    windows: "react-native-windows",
  };

  return (context, moduleName, platform) => {
    if (!platform) {
      throw new Error("No platform was specified");
    }

    const backupResolveRequest = context.resolveRequest;
    delete context.resolveRequest;

    let modifiedModuleName = remapModule(moduleName, platform);
    modifiedModuleName = remapReactNativeModule(
      modifiedModuleName,
      platform,
      availablePlatforms
    );
    modifiedModuleName = resolveModulePath(
      modifiedModuleName,
      context.originModulePath
    );
    modifiedModuleName = normalizePath(modifiedModuleName);

    const resolution = resolve(context, modifiedModuleName, platform);

    // Restoring `resolveRequest` must happen last
    context.resolveRequest = backupResolveRequest;

    return resolution;
  };
}

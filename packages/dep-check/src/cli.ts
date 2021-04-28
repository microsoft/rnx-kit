import path from "path";
import pkgDir from "pkg-dir";
import yargs from "yargs";
import { checkPackageManifest } from "./check";

export type Args = {
  write: boolean;
  "package-json"?: string | number;
};

export function cli({ write, "package-json": packageJson }: Args) {
  const packageManifest = (() => {
    if (typeof packageJson === "string") {
      return packageJson;
    }

    const packageDir = pkgDir.sync();
    if (packageDir) {
      return path.join(packageDir, "package.json");
    }

    return undefined;
  })();
  if (!packageManifest) {
    console.error("Could not find package manifest");
    process.exit(1);
  }

  const exitCode = checkPackageManifest(packageManifest, { write });
  process.exit(exitCode);
}

if (require.main === module) {
  yargs.usage(
    "$0 [package-json]",
    "Dependency checker for React Native apps",
    {
      write: {
        default: false,
        description: "Writes changes to the specified 'package.json'.",
        type: "boolean",
      },
    },
    cli
  ).argv;
}

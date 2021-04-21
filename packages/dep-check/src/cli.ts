import path from "path";
import pkgDir from "pkg-dir";
import yargs from "yargs";
import { checkPackageManifest } from "./check";

yargs.usage(
  "$0 [package-json]",
  "",
  {
    check: {
      default: false,
      description: "Returns error codes on exit when changes are needed.",
      type: "boolean",
    },
    write: {
      default: false,
      description: "Writes changes to the specified 'package.json'.",
      type: "boolean",
    },
  },
  ({ check, write, "package-json": packageJson }) => {
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

    const exitCode = checkPackageManifest(packageManifest, { check, write });
    process.exit(exitCode);
  }
).argv;

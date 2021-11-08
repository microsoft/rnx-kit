import { findPackage, readPackage } from "@rnx-kit/tools-node";
import { tsc } from "./tsc";

export function showVersion(): void {
  const pkgFile = findPackage(module.filename);
  if (pkgFile) {
    const pkg = readPackage(pkgFile);
    console.log("rn-tsc Version " + pkg.version);
  } else {
    console.log("rn-tsc Version Unknown");
  }
  tsc("--version");
}

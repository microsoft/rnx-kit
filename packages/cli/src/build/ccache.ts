import * as fs from "node:fs";
import * as path from "node:path";

export function setCcacheDir(dir: string): string | undefined {
  if (!fs.existsSync(dir)) {
    return undefined;
  }

  process.env["CCACHE_DIR"] = dir;
  return dir;
}

export function setCcacheHome(dir: string): string | undefined {
  if (!fs.existsSync(dir)) {
    return undefined;
  }

  process.env["CC"] = path.join(dir, "libexec", "clang");
  process.env["CXX"] = path.join(dir, "libexec", "clang++");
  process.env["CMAKE_C_COMPILER_LAUNCHER"] = path.join(dir, "bin", "ccache");
  process.env["CMAKE_CXX_COMPILER_LAUNCHER"] = path.join(dir, "bin", "ccache");
  return dir;
}

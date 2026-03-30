import * as nodefs from "node:fs";
import type { Lockfile } from "../types.ts";
import { parseLockfileV1 } from "./classic.ts";
import { parseLockfileV2 } from "./modern.ts";

export function loadLockfile(lockfilePath: string, fs = nodefs): Lockfile {
  const data = fs.readFileSync(lockfilePath, { encoding: "utf-8" });
  try {
    return parseLockfileV2(data);
  } catch (_) {
    // Fallback to classic Yarn
    return parseLockfileV1(data);
  }
}

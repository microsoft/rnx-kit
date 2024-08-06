import * as nodefs from "fs";

export function ensureDir(p: string, fs = nodefs): void {
  fs.mkdirSync(p, { recursive: true, mode: 0o755 });
}

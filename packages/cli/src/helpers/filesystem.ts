import * as nodefs from "fs"; // Cannot use `node:fs` because of Jest mocks

export function ensureDir(p: string, fs = nodefs): void {
  fs.mkdirSync(p, { recursive: true, mode: 0o755 });
}

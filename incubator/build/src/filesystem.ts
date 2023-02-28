import * as fs from "node:fs";

export function ensureDir(dir: string): string | undefined {
  return fs.mkdirSync(dir, { recursive: true, mode: 0o755 });
}

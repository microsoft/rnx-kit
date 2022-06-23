import * as fs from "node:fs/promises";

export function ensureDir(dir: string): Promise<string | undefined> {
  return fs.mkdir(dir, { recursive: true, mode: 0o755 });
}

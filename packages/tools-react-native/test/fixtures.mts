import { URL, fileURLToPath } from "node:url";

export function fixturePath(name: string): string {
  return fileURLToPath(new URL(`__fixtures__/${name}`, import.meta.url));
}

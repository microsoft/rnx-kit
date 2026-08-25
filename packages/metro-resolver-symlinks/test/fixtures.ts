import { URL, fileURLToPath } from "node:url";

export function useFixture(name: string): string {
  return fileURLToPath(new URL(`__fixtures__/${name}`, import.meta.url));
}

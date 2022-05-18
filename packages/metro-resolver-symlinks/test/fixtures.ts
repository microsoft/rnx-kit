// istanbul ignore file
import * as path from "path";

export function useFixture(name: string): string {
  return path.join(__dirname, "__fixtures__", name);
}

import { findMetroPath } from "@rnx-kit/tools-react-native/metro";

export function requireMetroPath(projectRoot: string): string {
  const p = findMetroPath(projectRoot);
  if (!p) {
    throw new Error("Cannot find module 'metro'");
  }
  return p;
}

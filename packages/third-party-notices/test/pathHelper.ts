import os from "node:os";

export const absolutePathRoot = os.platform() === "win32" ? "o:\\" : "/";

export function osSpecificPath(p: string): string {
  return os.platform() === "win32" ? p.replace(/[/]+/g, "\\") : p;
}

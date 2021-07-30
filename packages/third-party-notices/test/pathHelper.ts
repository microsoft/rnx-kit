import os from "os";

export const absolutePathRoot = os.platform() === "win32" ? "o:\\" : "/";

export function osSpecificPath(p: string): string {
  return os.platform() === "win32" ? p : p.replace(/[\\]+/g, "/");
}

import * as os from "node:os";

export const absolutePathRoot = os.platform() === "win32" ? "o:/" : "/";

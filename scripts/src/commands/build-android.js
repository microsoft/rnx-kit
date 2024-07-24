// @ts-check

import * as os from "node:os";
import * as path from "node:path";
import { spawn } from "../process.js";

/** @type {import("../process.js").Command} */
export async function buildAndroid(_args, rawArgs = []) {
  const wrapper = os.platform() === "win32" ? "gradlew.bat" : "gradlew";
  const gradlew = path.resolve("android", wrapper);
  await spawn(gradlew, rawArgs, { cwd: path.dirname(gradlew) });
}

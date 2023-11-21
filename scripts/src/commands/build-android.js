// @ts-check

import { spawn } from "node:child_process";
import * as os from "node:os";
import * as path from "node:path";

/** @type {import("../process.js").Command} */
export function buildAndroid(_args, rawArgs) {
  const wrapper = os.platform() === "win32" ? "gradlew.bat" : "gradlew";
  const gradlew = path.resolve("android", wrapper);
  return new Promise((resolve, reject) => {
    spawn(gradlew, rawArgs ?? [], {
      cwd: path.dirname(gradlew),
      stdio: "inherit",
    }).on("close", (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject();
      }
    });
  });
}

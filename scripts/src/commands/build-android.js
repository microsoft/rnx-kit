// @ts-check

const os = require("os");
const path = require("path");
const { spawn } = require("child_process");

/** @type {import("../process").Command} */
module.exports = async (_args, rawArgs) => {
  const gradlew = path.resolve(
    "android",
    os.platform() === "win32" ? "gradlew.bat" : "gradlew"
  );
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
};

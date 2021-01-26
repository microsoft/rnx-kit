// @ts-check

const { spawn } = require("child_process");
const { argv } = require("just-scripts");
const path = require("path");

exports.jest = () => {
  return function jest() {
    const cmd = process.execPath;
    const positional = argv()._.slice(1);
    const args = [
      require.resolve("jest/bin/jest.js"),
      "--colors",
      ...positional,
    ].filter((arg) => !!arg);
    return spawn(cmd, args, { stdio: "inherit" });
  };
};

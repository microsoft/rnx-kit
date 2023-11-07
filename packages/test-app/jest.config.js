const fs = require("node:fs");
const path = require("node:path");

function isPnpmMode() {
  const url = path.resolve(__dirname, "..", "..", ".yarnrc.yml");
  const yarnConfig = fs.readFileSync(url, { encoding: "utf-8" });
  return yarnConfig.includes("nodeLinker: pnpm");
}

const config = {
  preset: "@rnx-kit/jest-preset/private",
  moduleNameMapper: {
    "^internal(.*)$": "<rootDir>/src/internal$1",
  },
};

if (isPnpmMode()) {
  config["transformIgnorePatterns"] = [
    "/node_modules/.store/(?!((jest-)?react-native(-macos)?|@react-native(-community)?|@office-iss-react-native-win32|@?react-native-windows))",
  ];
}

module.exports = config;

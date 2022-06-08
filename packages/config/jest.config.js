const path = require("path");

module.exports = {
  preset: "@rnx-kit/jest-preset",
  moduleDirectories: [
    "node_modules",
    path.join(__dirname, "test", "__fixtures__", "node_modules"),
  ],
  setupFilesAfterEnv: ["jest-extended/all"],
};

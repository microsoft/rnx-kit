// @ts-check

const { eslintTask } = require("just-scripts");

exports.eslint = eslintTask({
  configPath: "package.json",
  files: ["src/*"],
});

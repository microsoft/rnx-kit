const { eslintTask } = require("just-scripts");
export const eslint = eslintTask({
  configPath: "package.json",
  files: ["src/*"],
});

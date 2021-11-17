// @ts-check

const { prettierTask } = require("just-scripts");

exports.prettier = prettierTask({
  files: [
    "**/*.{js,json,jsx,md,ts,tsx,yml}",
    "!{CODE_OF_CONDUCT,SECURITY}.md",
    "!**/{__fixtures__,lib}/**",
    "!**/CHANGELOG.*",
  ],
});

import { prettierTask } from "just-scripts";

const options = {
  files: [
    "**/*.{js,json,jsx,md,ts,tsx,yml}",
    "!{CODE_OF_CONDUCT,SECURITY}.md",
    "!**/{__fixtures__,lib}/**",
    "!**/CHANGELOG.*",
  ],
};

export const prettier = prettierTask(options);

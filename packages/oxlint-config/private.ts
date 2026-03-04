import { defineConfig } from "oxlint";
import sdlCommon from "./src/configs/sdl-common.js";
import sdlNode from "./src/configs/sdl-node.js";
import sdlReact from "./src/configs/sdl-react.js";
import strict from "./src/configs/strict.js";
import stylistic from "./src/configs/typescript-stylistic.js";

export default defineConfig({
  extends: [sdlCommon, sdlNode, sdlReact, strict, stylistic],
  rules: {
    "@rnx-kit/no-foreach-with-captured-variables": "error",
  },
  overrides: [
    {
      files: ["**/*.config.[jt]s"],
      rules: {
        "import/no-default-export": "off",
      },
    },
    {
      files: ["**/types.ts"],
      rules: {
        "@rnx-kit/type-definitions-only": "error",
      },
    },
  ],
});

import { defineConfig } from "oxlint";
import sdlCommon from "./src/configs/sdl-common.ts";
import sdlNode from "./src/configs/sdl-node.ts";
import sdlReact from "./src/configs/sdl-react.ts";
import strict from "./src/configs/strict.ts";
import stylistic from "./src/configs/typescript-stylistic.ts";

export default defineConfig({
  extends: [sdlCommon, sdlNode, sdlReact, strict, stylistic],
  rules: {
    "@rnx-kit/no-foreach-with-captured-variables": "error",
  },
  overrides: [
    {
      files: ["**/oxlint.config.ts"],
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

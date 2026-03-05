import { defineConfig } from "oxlint";
import sdlRequired from "./src/configs/sdl-required.js";
import strict from "./src/configs/strict.js";
import stylistic from "./src/configs/typescript-stylistic.js";

export default defineConfig({
  extends: [sdlRequired, strict, stylistic],
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

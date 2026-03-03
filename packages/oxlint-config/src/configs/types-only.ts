import { defineConfig } from "oxlint";
import strict from "./strict.ts";
import stylistic from "./typescript-stylistic.ts";

export default defineConfig({
  extends: [strict, stylistic],
  rules: {
    "@rnx-kit/type-definitions-only": "error",
    "typescript/consistent-type-definitions": ["error", "type"],
  },
  overrides: [
    {
      files: ["**/oxlint.config.ts"],
      rules: {
        "@rnx-kit/type-definitions-only": "off",
        "import/no-default-export": "off",
      },
    },
  ],
});

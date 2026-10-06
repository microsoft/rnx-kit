import config from "@rnx-kit/oxlint-config/private";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [config],
  overrides: [
    {
      // Evals and this config are loaded via their default export
      files: ["oxlint.config.ts", "**/*.eval.ts"],
      rules: {
        "import/no-default-export": "off",
      },
    },
  ],
});

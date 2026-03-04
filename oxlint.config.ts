import strict from "@rnx-kit/oxlint-config/strict";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [strict],
  overrides: [
    {
      files: ["index.js", "oxlint.config.ts"],
      rules: {
        "no-default-export": "off",
      },
    },
  ],
});

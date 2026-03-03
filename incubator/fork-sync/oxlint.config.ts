import config from "@rnx-kit/oxlint-config/private";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [config],
  rules: {
    // fork-sync uses interfaces extensively; allow both interface and type
    "typescript/consistent-type-definitions": "off",
    "no-new-array": "off",
  },
  overrides: [
    {
      files: ["eslint.config.js", "oxlint.config.ts"],
      rules: {
        "import/no-default-export": "off",
      },
    },
    {
      files: ["test/proc.test.ts", "test/tty-ui.test.ts"],
      rules: {
        "no-control-regex": "off",
      },
    },
  ],
});

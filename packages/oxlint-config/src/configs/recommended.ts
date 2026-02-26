import { defineConfig } from "oxlint";
import eslint from "./eslint-recommended.ts";
import typescript from "./typescript-recommended.ts";

export default defineConfig({
  extends: [eslint, typescript],
  // https://oxc.rs/docs/guide/usage/linter/config.html#enable-groups-of-rules-with-categories
  categories: {
    correctness: "error",
  },
  // https://oxc.rs/docs/guide/usage/linter/plugins.html#supported-plugins
  plugins: ["node", "oxc", "react"],
  // https://oxc.rs/docs/guide/usage/linter/config.html#configure-js-plugins-experimental
  jsPlugins: [
    {
      name: "@react-native",
      specifier: import.meta.resolve("@react-native/eslint-plugin"),
    },
    {
      name: "@rnx-kit",
      specifier: import.meta.resolve("@rnx-kit/eslint-plugin"),
    },
  ],
  // https://oxc.rs/docs/guide/usage/linter/rules.html
  rules: {
    "@react-native/platform-colors": "error",
    "@rnx-kit/no-const-enum": "warn",
    "@rnx-kit/no-export-all": "warn",
    "@rnx-kit/no-foreach-with-captured-variables": "warn",
    "no-unused-expressions": "off", // Catches valid expressions like template literals
    "typescript/consistent-type-imports": [
      "error", // typescript/style
      { disallowTypeAnnotations: false },
    ],
  },
});

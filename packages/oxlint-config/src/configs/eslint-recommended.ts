import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
  },
  plugins: ["eslint", "unicorn"],
  rules: {
    "no-case-declarations": "error", // eslint/pedantic
    "no-empty": "error", // eslint/restriction
    "no-empty-file": "off", // unicorn/correctness
    "no-empty-function": "error", // eslint/restriction
    "no-fallthrough": "error", // eslint/pedantic
    "no-new-func": "error", // eslint/style
    "no-prototype-builtins": "error", // eslint/pedantic
    "no-redeclare": "error", // eslint/pedantic
    "no-regex-spaces": "error", // eslint/restriction
    "no-unexpected-multiline": "error", // eslint/suspicious
    "no-unused-vars": [
      "error",
      {
        args: "all",
        argsIgnorePattern: "^_",
        caughtErrors: "all",
        caughtErrorsIgnorePattern: "^_",
        destructuredArrayIgnorePattern: "^_",
        varsIgnorePattern: "^_",
        ignoreRestSiblings: true,
      },
    ],
    "no-unneeded-ternary": "warn", // eslint/suspicious
  },
});

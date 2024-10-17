import { RuleTester } from "eslint";

export function makeRuleTester() {
  return new RuleTester({
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaVersion: "latest",
        sourceType: "module",
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  });
}

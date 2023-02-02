import { RuleTester } from "eslint";

export function makeRuleTester() {
  return new RuleTester({
    env: {
      es6: true,
      node: true,
    },
    parser: require.resolve("@typescript-eslint/parser"),
    parserOptions: {
      ecmaFeatures: {
        jsx: true,
      },
      ecmaVersion: 2018,
      sourceType: "module",
    },
  });
}

import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
  },
  plugins: ["typescript"],
  rules: {
    "typescript/adjacent-overload-signatures": "error",
    "typescript/array-type": "error",
    "typescript/ban-tslint-comment": "error",
    "typescript/class-literal-property-style": "error",
    "typescript/consistent-generic-constructors": "error",
    "typescript/consistent-indexed-object-style": "error",
    "typescript/consistent-type-assertions": "error",
    "typescript/consistent-type-definitions": ["error", "type"],
    "typescript/no-inferrable-types": "error",
    "typescript/prefer-for-of": "error",
    "typescript/prefer-function-type": "error",
  },
});

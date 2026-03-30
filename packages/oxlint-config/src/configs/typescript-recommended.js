import { defineConfig } from "oxlint";

export default defineConfig({
  categories: {
    correctness: "error",
  },
  plugins: ["eslint", "typescript", "unicorn"],
  rules: {
    "no-array-constructor": "error", // eslint/pedantic
    "no-class-assign": "off", // turned off by @typescript-eslint/recommended
    "no-const-assign": "off", // turned off by @typescript-eslint/recommended
    "no-dupe-class-members": "off", // turned off by @typescript-eslint/recommended
    "no-dupe-keys": "off", // turned off by @typescript-eslint/recommended
    "no-func-assign": "off", // turned off by @typescript-eslint/recommended
    "no-import-assign": "off", // turned off by @typescript-eslint/recommended
    "no-new-native-nonconstructor": "off", // turned off by @typescript-eslint/recommended
    "no-obj-calls": "off", // turned off by @typescript-eslint/recommended
    "no-redeclare": "off", // turned off by @typescript-eslint/recommended
    "no-setter-return": "off", // turned off by @typescript-eslint/recommended
    "no-this-before-super": "off", // turned off by @typescript-eslint/recommended
    "no-unreachable": "off", // turned off by @typescript-eslint/recommended
    "no-unsafe-negation": "off", // turned off by @typescript-eslint/recommended
    "no-var": "error", // eslint/restriction
    "no-with": "off", // turned off by @typescript-eslint/recommended
    "prefer-const": [
      "error", // eslint/style
      { destructuring: "any", ignoreReadBeforeAssign: false },
    ],
    "prefer-rest-params": "error", // eslint/style
    "prefer-spread": "error", // eslint/style
    "typescript/ban-ts-comment": "error", // typescript/pedantic
    "typescript/no-confusing-non-null-assertion": "error", // typescript/suspicious
    "typescript/no-empty-object-type": "error", // typescript/restriction
    "typescript/no-explicit-any": "error", // typescript/restriction
    "typescript/no-namespace": "error", // typescript/restriction
    "typescript/no-unnecessary-type-constraint": "error", // typescript/suspicious
    "typescript/no-unsafe-function-type": "error", // typescript/pedantic
    "typescript/prefer-ts-expect-error": "error", // typescript/pedantic
  },
});

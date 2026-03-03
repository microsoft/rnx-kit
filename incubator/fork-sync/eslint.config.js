import config from "@rnx-kit/eslint-config";

export default [
  ...config,
  {
    rules: {
      // fork-sync uses interfaces extensively; allow both interface and type
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },
  {
    files: ["eslint.config.js", "oxlint.config.ts"],
    rules: {
      "no-restricted-exports": "off",
    },
  },
  {
    files: ["test/proc.test.ts", "test/tty-ui.test.ts"],
    rules: {
      "no-control-regex": "off",
    },
  },
];

import config from "@rnx-kit/eslint-config";

// oxlint-disable-next-line no-default-export
export default [
  ...config,
  {
    rules: {
      // fork-sync uses interfaces extensively; allow both interface and type
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },
];

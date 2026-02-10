import config from "@rnx-kit/eslint-config";

// eslint-disable-next-line no-restricted-exports
export default [
  ...config,
  {
    rules: {
      // fork-sync uses interfaces extensively; allow both interface and type
      "@typescript-eslint/consistent-type-definitions": "off",
    },
  },
];

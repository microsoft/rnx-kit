import { defineConfig } from "oxlint";

// https://github.com/microsoft/eslint-plugin-sdl/blob/main/config/react.js
export default defineConfig({
  plugins: ["react"],
  rules: {
    "react/iframe-missing-sandbox": "error",
    "react/jsx-no-target-blank": [
      "error",
      {
        allowReferrer: false,
        enforceDynamicLinks: "always",
        warnOnSpreadAttributes: true,
      },
    ],
    "react/no-danger": "error",
  },
});

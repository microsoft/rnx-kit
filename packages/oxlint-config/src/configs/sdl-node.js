import { defineConfig } from "oxlint";

// https://github.com/microsoft/eslint-plugin-sdl/blob/v1.1.0/config/node.js
export default defineConfig({
  plugins: ["typescript"],
  jsPlugins: [
    {
      name: "@microsoft/sdl",
      specifier: import.meta.resolve("../rules/sdl.js"),
    },
  ],
  rules: {
    "@microsoft/sdl/no-unsafe-alloc": "error",
    "typescript/no-deprecated": "error",
  },
});

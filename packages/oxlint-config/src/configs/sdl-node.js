import { defineConfig } from "oxlint";

// https://github.com/microsoft/eslint-plugin-sdl/blob/main/config/node.js
export default defineConfig({
  plugins: ["typescript"],
  jsPlugins: [
    {
      name: "@microsoft/sdl",
      specifier: import.meta.resolve("@microsoft/eslint-plugin-sdl"),
    },
  ],
  rules: {
    "@microsoft/sdl/no-unsafe-alloc": "error",
    "typescript/no-deprecated": "error",
  },
});

import { defineConfig } from "oxlint";

// https://github.com/microsoft/eslint-plugin-sdl/blob/v1.1.0/config/common.js
export default defineConfig({
  jsPlugins: [
    {
      name: "@microsoft/sdl",
      specifier: import.meta.resolve("../rules/sdl.js"),
    },
  ],
  rules: {
    "@microsoft/sdl/no-cookies": "error",
    "@microsoft/sdl/no-document-domain": "error",
    "@microsoft/sdl/no-document-write": "error",
    "@microsoft/sdl/no-html-method": "error",
    "@microsoft/sdl/no-inner-html": "error",
    "@microsoft/sdl/no-insecure-url": "error",
    "@microsoft/sdl/no-msapp-exec-unsafe": "error",
    "@microsoft/sdl/no-postmessage-star-origin": "error",
    "@microsoft/sdl/no-winjs-html-unsafe": "error",
  },
});

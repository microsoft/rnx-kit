import { defineConfig } from "oxlint";
import config from "./private.ts";

export default defineConfig({
  extends: [config],
  rules: {
    // oxlint expects default exports
    "no-default-export": "off",
  },
});

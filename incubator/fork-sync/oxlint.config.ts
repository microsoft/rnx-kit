import config from "@rnx-kit/oxlint-config/private";
import { defineConfig } from "oxlint";

export default defineConfig({
  extends: [config],
  rules: {
    // fork-sync uses interfaces extensively; allow both interface and type
    "typescript/consistent-type-definitions": "off",
    "no-new-array": "off",
  },
});

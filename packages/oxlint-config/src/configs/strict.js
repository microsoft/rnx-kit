import { defineConfig } from "oxlint";
import recommended from "./recommended.js";

export default defineConfig({
  extends: [recommended],
  plugins: ["import"],
  rules: {
    "@rnx-kit/no-const-enum": "error",
    "@rnx-kit/no-export-all": "error",
    "import/no-default-export": "error",
    "no-unneeded-ternary": "error",
  },
});

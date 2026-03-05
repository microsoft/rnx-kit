import { defineConfig } from "oxlint";
import common from "./sdl-common.js";
import node from "./sdl-node.js";
import react from "./sdl-react.js";

// https://github.com/microsoft/eslint-plugin-sdl/blob/v1.1.0/config/node.js
export default defineConfig({
  extends: [common, node, react],
});

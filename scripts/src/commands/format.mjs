// @ts-check

import { createRequire } from "node:module";
import { runScript } from "../process.mjs";

/** @type {import("../process.mjs").Command} */
export default async function format() {
  const require = createRequire(import.meta.url);
  await runScript(
    "prettier",
    "--write",
    "--plugin",
    `${require.resolve("prettier-plugin-organize-imports")}`,
    "--log-level",
    "error",
    "**/*.{js,json,jsx,md,ts,tsx,yml}",
    "!{CODE_OF_CONDUCT,SECURITY}.md",
    "!**/{__fixtures__,lib}/**",
    "!**/CHANGELOG.*"
  );
}

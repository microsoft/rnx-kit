import { styleText } from "node:util";

type Color = (s: string) => string;
type Log = typeof console.log;

// Force disable colors in test environments
if (process.env["NODE_TEST_CONTEXT"] || process.env["NODE_ENV"] === "test") {
  process.env["FORCE_COLOR"] = "0";
}

const errorTag = styleText(["red", "bold"], "error");
const infoTag = styleText(["cyan", "bold"], "info");
const warnTag = styleText(["yellow", "bold"], "warn");

export const bold: Color = (s) => styleText("bold", s);
export const dim: Color = (s) => styleText("dim", s);

export const error: Log = (...args) => console.error(errorTag, ...args);
export const info: Log = (...args) => console.log(infoTag, ...args);
export const warn: Log = (...args) => console.warn(warnTag, ...args);

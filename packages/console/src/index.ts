import { WriteStream } from "tty";

type Color = (s: string) => string;
type Log = typeof console.log;

let errorTag: string;
let infoTag: string;
let warnTag: string;

export let bold: Color;
export let dim: Color;

export const error: Log = (...args) => console.error(errorTag, ...args);
export const info: Log = (...args) => console.log(infoTag, ...args);
export const warn: Log = (...args) => console.warn(warnTag, ...args);

if (WriteStream.prototype.hasColors() && process.env["NODE_ENV"] !== "test") {
  errorTag = "\u001B[31m\u001B[1merror\u001B[22m\u001B[39m";
  infoTag = "\u001B[36m\u001B[1minfo\u001B[22m\u001B[39m";
  warnTag = "\u001B[33m\u001B[1mwarn\u001B[22m\u001B[39m";
  bold = (s) => "\u001B[1m" + s + "\u001B[22m";
  dim = (s) => "\u001B[2m" + s + "\u001B[22m";
} else {
  errorTag = "error";
  infoTag = "info";
  warnTag = "warn";
  bold = (s) => s;
  dim = bold;
}

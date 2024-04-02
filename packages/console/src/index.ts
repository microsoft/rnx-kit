import { WriteStream } from "tty";

type Log = typeof console.log;

let errorTag: string;
let infoTag: string;
let warnTag: string;

if (WriteStream.prototype.hasColors() && process.env["NODE_ENV"] !== "test") {
  errorTag = "\u001B[31m\u001B[1merror\u001B[22m\u001B[39m";
  infoTag = "\u001B[36m\u001B[1minfo\u001B[22m\u001B[39m";
  warnTag = "\u001B[33m\u001B[1mwarn\u001B[22m\u001B[39m";
} else {
  errorTag = "error";
  infoTag = "info";
  warnTag = "warn";
}

export const error: Log = (...args) => console.error(errorTag, ...args);
export const info: Log = (...args) => console.log(infoTag, ...args);
export const warn: Log = (...args) => console.warn(warnTag, ...args);

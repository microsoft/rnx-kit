/* eslint-disable @typescript-eslint/no-explicit-any */
import { b } from "./b";

// oxlint-disable-next-line no-unused-vars
export function c(x: any) {
  return "123" + b() + "456";
}

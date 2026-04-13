import defaultExport from "module-a";
import { named1, named2 } from "module-b";
import * as ns from "module-c";
import { original as alias } from "module-d";

const lazy = () => import("module-e");

export const x = 1;
export function hello() {
  return "world";
}
export { defaultExport, named1, named2 };
export { ns as namespace };
export default lazy;

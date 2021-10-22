import path from "path";
import { cleanTask } from "just-scripts";

export const clean = cleanTask({
  paths: [
    "bin",
    "coverage",
    "dist",
    "lib",
    "lib-amd",
    "lib-commonjs",
    "lib-es2015",
    "lib-es6",
    "temp",
  ].map((p) => path.join(process.cwd(), p)),
});

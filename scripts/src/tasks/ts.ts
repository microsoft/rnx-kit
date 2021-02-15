import path from "path";
import { tscTask, argv } from "just-scripts";

const libPath = path.resolve(process.cwd(), "lib");
const srcPath = path.resolve(process.cwd(), "src");

export const ts = tscTask({
  outDir: "lib",
  ...(argv().production && {
    inlineSources: true,
    sourceRoot: path.relative(libPath, srcPath),
  }),
});

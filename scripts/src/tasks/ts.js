// @ts-check

const { argv, tscTask } = require("just-scripts");
const path = require("path");

const libPath = path.resolve(process.cwd(), "lib");
const srcPath = path.resolve(process.cwd(), "src");

exports.ts = tscTask({
  outDir: "lib",
  ...(argv().production && {
    inlineSources: true,
    sourceRoot: path.relative(libPath, srcPath),
  }),
});

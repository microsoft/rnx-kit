// @ts-check

const esbuild = require("esbuild");
const fs = require("fs");
const { argv } = require("just-task");

function bundle() {
  const { minify, platform } = argv();

  const manifest = fs.readFileSync("package.json", { encoding: "utf-8" });
  const { main, dependencies } = JSON.parse(manifest);

  const targetPlatform = platform || "node";
  esbuild.build({
    bundle: true,
    entryPoints: ["src/index.ts"],
    external: [
      ...(dependencies ? Object.keys(dependencies) : []),
      "./package.json",
    ],
    minify,
    outfile: main,
    platform: targetPlatform,
    banner:
      targetPlatform === "node" ? { js: "#!/usr/bin/env node" } : undefined,
  });
}

exports.bundle = bundle;

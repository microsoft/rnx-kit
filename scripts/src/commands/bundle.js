// @ts-check

const { discardResult } = require("../process");

/**
 * @param {unknown} platform
 * @returns {"browser" | "neutral" | "node"}
 */
function ensureValidPlatform(platform) {
  switch (platform) {
    case "browser":
    case "neutral":
    case "node":
      return platform;

    default:
      return "node";
  }
}

/**
 * @param {Record<string, unknown>=} args
 */
function bundle({ minify, platform } = { minify: false, platform: "node" }) {
  const fs = require("fs");

  const manifest = fs.readFileSync("package.json", { encoding: "utf-8" });
  const { main, dependencies } = JSON.parse(manifest);
  const targetPlatform = ensureValidPlatform(platform);

  return require("esbuild")
    .build({
      bundle: true,
      entryPoints: ["src/index.ts"],
      external: [
        ...(dependencies ? Object.keys(dependencies) : []),
        "./package.json",
      ],
      minify: Boolean(minify),
      outfile: main,
      platform: targetPlatform,
      banner:
        targetPlatform === "node" ? { js: "#!/usr/bin/env node" } : undefined,
    })
    .then(discardResult);
}

module.exports = bundle;

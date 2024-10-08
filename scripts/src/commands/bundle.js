// @ts-check

import * as fs from "node:fs";

const defaultOptions = {
  minify: false,
  platform: "node",
};

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
 * @param {Record<string, unknown> | undefined} options
 */
export async function bundle(options) {
  const { minify, platform } = { ...defaultOptions, ...options };
  const targetPlatform = ensureValidPlatform(platform);

  const manifest = fs.readFileSync("package.json", { encoding: "utf-8" });
  const { main, dependencies, peerDependencies } = JSON.parse(manifest);

  const esbuild = await import("esbuild");
  await esbuild.build({
    bundle: true,
    outfile: main,
    external: [
      ...(dependencies ? Object.keys(dependencies) : []),
      ...(peerDependencies ? Object.keys(peerDependencies) : []),
      "./package.json",
    ],
    conditions: ["typescript"],
    banner:
      targetPlatform === "node" ? { js: "#!/usr/bin/env node" } : undefined,
    entryPoints: ["src/index.ts"],
    target: targetPlatform === "node" ? "node16.17.0" : "es2021",
    platform: targetPlatform,
    minify: Boolean(minify),
  });
}

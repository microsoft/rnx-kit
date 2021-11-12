import * as esbuild from "esbuild";
import * as fs from "fs";
import { argv } from "just-task";

export function bundle(): void {
  const { minify, platform } = argv();

  const manifest = fs.readFileSync("package.json", { encoding: "utf-8" });
  const { main, dependencies } = JSON.parse(manifest);

  const targetPlatform = platform || "node";
  esbuild.build({
    bundle: true,
    entryPoints: ["src/index.ts"],
    external: [
      ...(dependencies && Object.keys(dependencies)),
      "./package.json",
    ],
    minify,
    outfile: main,
    platform: targetPlatform,
    banner:
      targetPlatform === "node" ? { js: "#!/usr/bin/env node" } : undefined,
  });
}

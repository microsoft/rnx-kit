#!/usr/bin/env node
// @ts-check

// This file is run before `npm install` and can therefore not have any
// third-party dependencies.
import { existsSync as fileExists } from "fs";
import fs from "fs/promises";
import path from "path";
import url from "url";

async function main() {
  const workspaceRoot = path.dirname(
    // Ignore `The 'import.meta' meta-property is only allowed when... ts(1343)`
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    path.dirname(url.fileURLToPath(import.meta.url))
  );

  const lockFile = await fs.readFile(
    path.join(workspaceRoot, "package-lock.json"),
    { encoding: "utf-8" }
  );
  const { packages } = JSON.parse(lockFile);

  for (const [modulePath, info] of Object.entries(packages)) {
    if (modulePath.includes("@rnx-kit/")) {
      const { resolved, link } = info;
      if (!link || !fileExists(path.join(workspaceRoot, resolved))) {
        throw new Error(`${modulePath} was resolved to an external package`);
      }
    }
  }
}

main();

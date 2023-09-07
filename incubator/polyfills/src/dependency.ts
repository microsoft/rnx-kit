import { error } from "@rnx-kit/console";
import { readPackage } from "@rnx-kit/tools-node";
import * as fs from "fs";
import * as path from "path";
import type { Context } from "./types";

function getDependencies({ projectRoot }: Context): string[] {
  const manifest = readPackage(projectRoot);

  const dependencies = new Set<string>();
  for (const section of ["dependencies", "devDependencies"] as const) {
    const names = manifest[section];
    if (names) {
      Object.keys(names).forEach((name) => dependencies.add(name));
    }
  }

  return Array.from(dependencies);
}

export function resolvePath(fromDir: string, p: unknown): string | null {
  if (typeof p !== "string" || !p) {
    return null;
  }

  const resolved = path.resolve(fromDir, p);
  return resolved.startsWith(fromDir) ? resolved : null;
}

export function getDependencyPolyfills(context: Context): string[] {
  const polyfills: string[] = [];

  const options = { paths: [context.projectRoot] };
  const dependencies = getDependencies(context);

  for (const name of dependencies) {
    try {
      const config = require.resolve(`${name}/react-native.config.js`, options);
      const polyfill = require(config).dependency?.api?.polyfill;
      if (polyfill == null) {
        continue;
      }

      const absolutePath = resolvePath(path.dirname(config), polyfill);
      if (!absolutePath) {
        error(`${name}: invalid polyfill path: ${polyfill}`);
        continue;
      }

      if (!fs.existsSync(absolutePath)) {
        error(`${name}: no such polyfill: ${polyfill}`);
        continue;
      }

      polyfills.push(absolutePath);
    } catch (_) {
      // ignore
    }
  }

  return polyfills;
}

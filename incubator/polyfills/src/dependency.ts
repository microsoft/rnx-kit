import { error } from "@rnx-kit/console";
import { readPackage } from "@rnx-kit/tools-node";
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

function isValidPath(p: string): boolean {
  return (
    Boolean(p) &&
    !p.startsWith("..") &&
    !p.startsWith("/") &&
    !/^[A-Za-z]:/.test(p)
  );
}

export function getDependencyPolyfills(context: Context): string[] {
  const polyfills: string[] = [];

  const options = { paths: [context.projectRoot] };
  const dependencies = getDependencies(context);

  for (const name of dependencies) {
    try {
      const config = require.resolve(`${name}/react-native.config.js`, options);
      const polyfill = require(config).dependency?.api?.polyfill;
      if (typeof polyfill === "string") {
        if (!isValidPath(polyfill)) {
          error(`${name}: invalid polyfill path: ${polyfill}`);
          continue;
        }

        polyfills.push(path.resolve(path.dirname(config), polyfill));
      }
    } catch (_) {
      // ignore
    }
  }

  return polyfills;
}

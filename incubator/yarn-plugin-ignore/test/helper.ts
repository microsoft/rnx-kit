import type { Descriptor, Locator, ResolveOptions } from "@yarnpkg/core";
import { structUtils } from "@yarnpkg/core";
import { IGNORE_PROTOCOL } from "../src/constants.ts";

export type PackageInfo = {
  descriptor: Descriptor;
  locator: Locator;
};

export function makePackageInfo(): PackageInfo {
  const ident = structUtils.makeIdent("rnx-kit", "yarn-plugin-ignore");
  return {
    descriptor: structUtils.makeDescriptor(ident, IGNORE_PROTOCOL),
    locator: structUtils.makeLocator(ident, IGNORE_PROTOCOL),
  };
}

export function makeResolveOptions(): ResolveOptions {
  return {
    project: {
      configuration: {
        get() {
          return "javascript";
        },
      },
    },
  } as unknown as ResolveOptions;
}

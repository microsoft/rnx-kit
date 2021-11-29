import type { PackageModuleRef } from "@rnx-kit/tools-node";
import { isFileModuleRef, parseModuleRef } from "@rnx-kit/tools-node";
import * as fs from "fs";
import * as path from "path";
import type { ModuleResolver, ResolutionContext } from "../types";

type Resolver = (fromDir: string, moduleId: string) => string;

type ResolverOptions = {
  extensions: string[];
  mainFields: string[];
};

type Options = Partial<ResolverOptions> & {
  test: (moduleName: string) => boolean;
};

const DEFAULT_OPTIONS = {
  extensions: [".ts", ".tsx"],
  mainFields: ["module", "main"],
};

export function expandPlatformExtensions(
  platform: string,
  extensions: string[]
): string[] {
  const platforms = (() => {
    switch (platform) {
      case "win32":
      case "windows":
        return [platform, "win", "native"];
      default:
        return [platform, "native"];
    }
  })();

  const platformExtensions = platforms.reduce<string[]>(
    (platformExtensions, platform) => {
      platformExtensions.push(...extensions.map((ext) => `.${platform}${ext}`));
      return platformExtensions;
    },
    []
  );

  platformExtensions.push(...extensions);
  return platformExtensions;
}

export function remapLibToSrc(
  { originModulePath }: ResolutionContext,
  ref: PackageModuleRef,
  resolver: Resolver
): string | undefined {
  const pattern = /^[./]*lib\b/;
  const { name, scope, path: modulePath } = ref;
  if (!modulePath || !pattern.test(modulePath)) {
    return undefined;
  }

  const fromDir = originModulePath
    ? path.dirname(originModulePath)
    : process.cwd();
  const packageName = scope ? `${scope}/${name}` : name;
  return resolver(
    fromDir,
    `${packageName}/${modulePath.replace(pattern, "src")}`
  );
}

export function resolveModule(
  fromDir: string,
  moduleId: string,
  resolver: Resolver,
  { mainFields }: ResolverOptions
): string {
  const manifestPath = resolver(fromDir, moduleId + "/package.json");
  const content = fs.readFileSync(manifestPath, { encoding: "utf-8" });
  const manifest = JSON.parse(content);
  for (const mainField of mainFields) {
    const main = manifest[mainField];
    if (main) {
      return main;
    }
  }

  throw new Error(
    `A main field (e.g. ${mainFields.join(", ")}) is missing for '${moduleId}'`
  );
}

export function resolveModulePath(
  { originModulePath }: ResolutionContext,
  ref: PackageModuleRef,
  resolver: Resolver,
  options: ResolverOptions
): PackageModuleRef {
  if (ref.path) {
    return ref;
  }

  const fromDir = originModulePath
    ? path.dirname(originModulePath)
    : process.cwd();
  const { name, scope } = ref;
  const packageName = scope ? `${scope}/${name}` : name;
  const modulePath = resolveModule(fromDir, packageName, resolver, options);

  return {
    name,
    scope,
    path: modulePath.replace(/\.jsx?$/, ""),
  };
}

export function remapImportPath({ test, ...options }: Options): ModuleResolver {
  if (typeof test !== "function") {
    throw new Error(
      "Expected option `test` to be a function `(moduleId: string) => boolean`"
    );
  }

  const resolverOptions = {
    ...DEFAULT_OPTIONS,
    ...options,
  };

  const getResolver = (() => {
    const { extensions, mainFields } = resolverOptions;
    let resolve: Resolver;
    return (platform: string) => {
      if (!resolve) {
        resolve = require("enhanced-resolve").create.sync({
          extensions: expandPlatformExtensions(platform, extensions),
          mainFields,
        });
      }
      return resolve;
    };
  })();

  return (context, moduleId, platform) => {
    const ref = parseModuleRef(moduleId);
    if (isFileModuleRef(ref) || !test(moduleId)) {
      return moduleId;
    }

    const resolve = getResolver(platform);
    const resolvedRef = resolveModulePath(
      context,
      ref,
      resolve,
      resolverOptions
    );
    return remapLibToSrc(context, resolvedRef, resolve) || moduleId;
  };
}

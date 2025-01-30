import { type Project, Service } from "@rnx-kit/typescript-service";
import path from "node:path";
import ts from "typescript";
import { parseFileDetails } from "./platforms";
import type { BuildContext, PlatformInfo } from "./types";

type ResolveHelper = (
  module: string,
  file: string,
  redirected?: ts.ResolvedProjectReference
) => ts.ResolvedModuleWithFailedLookupLocations;

/**
 * Map of file resolution lookups, these are the ones with platform suffix overrides
 */
const fileLookupMap = new Map<
  string,
  Record<string, ts.ResolvedModuleWithFailedLookupLocations>
>();

const platformHosts: Record<string, PlatformHost> = {};

/**
 * Get the platform host for a given platform, will be cached for that platform
 * @returns platform specific host implementation
 */
export function getPlatformHost(platformInfo?: PlatformInfo): PlatformHost {
  const platformName = platformInfo?.name ?? "none";
  const remap = platformInfo?.remapReactNative;
  const key = platformName + remap ? "-remap" : "";
  platformHosts[key] ??= new PlatformHost(platformInfo);
  return platformHosts[key];
}

export function openProject(context: BuildContext): Project {
  return getPlatformHost(context.platform).createProject(context);
}

export class PlatformHost {
  private suffixes?: string[];
  private remap: Record<string, string> = {};
  private service = new Service();
  private newResolvers = ts.versionMajorMinor >= "5.0";

  constructor(platform: PlatformInfo = { name: "" } as PlatformInfo) {
    this.suffixes = platform.suffixes;
    const { remapReactNative, pkgName } = platform;

    if (remapReactNative && pkgName && pkgName !== "react-native") {
      this.remap["react-native"] = pkgName;
    }
  }

  createProject(context: BuildContext): Project {
    let { cmdLine } = context;
    if (this.suffixes && this.suffixes.length > 0 && this.newResolvers) {
      // if we have suffixes set them for typescript 5, for 4.X they don't quite work as expected
      cmdLine = {
        ...cmdLine,
        options: {
          ...cmdLine.options,
          moduleSuffixes: this.suffixes.map((s) => `.${s}`),
        },
      };
    }

    // create the host enhancer and open the project
    const enhancer = this.createHostEnhancer(context);
    return this.service.openProject(cmdLine, enhancer);
  }

  private createHostEnhancer(context: BuildContext) {
    return (host: ts.LanguageServiceHost) => {
      // override writeFile if an alternate writer is specified
      if (context.writer) {
        host.writeFile = (file, content) =>
          context.writer!.writeFile(file, content);
      }

      // for lower versions of typescript hook the resolveModuleNames and resolveTypeReferenceDirectives functions
      if (!this.newResolvers) {
        const { root } = context;
        const { options } = context.cmdLine;
        const cache = ts.createModuleResolutionCache(root, (x) => x, options);

        const resolver = (
          module: string,
          file: string,
          redirected?: ts.ResolvedProjectReference
        ) => {
          return ts.resolveModuleName(
            module,
            file,
            options,
            host,
            cache,
            redirected
          );
        };

        // create an override for the module resolution function
        host.resolveModuleNames = (
          moduleNames: string[],
          containingFile: string,
          _reusedNames: string[] | undefined,
          redirected: ts.ResolvedProjectReference | undefined
        ): (ts.ResolvedModuleFull | undefined)[] => {
          return this.resolveModuleNames(
            resolver,
            moduleNames,
            containingFile,
            redirected
          );
        };

        // create an override for the type reference resolution function
        host.resolveTypeReferenceDirectives = (
          typeDirectiveNames: string[] | ts.FileReference[],
          containingFile: string,
          redirected: ts.ResolvedProjectReference | undefined
        ): (ts.ResolvedTypeReferenceDirective | undefined)[] => {
          console.log(`Types in ${containingFile}: `, typeDirectiveNames);
          return typeDirectiveNames.map((name) => {
            return ts.resolveTypeReferenceDirective(
              name as string,
              containingFile,
              options,
              host,
              redirected
            ).resolvedTypeReferenceDirective;
          });
        };
      }
    };
  }

  private getModuleLookups(module: string): string[] {
    const fileRef = module.startsWith(".") || path.isAbsolute(module);
    if (fileRef && this.suffixes) {
      const { base, suffix, ext } = parseFileDetails(module);
      if (ext && (!suffix || !this.suffixes.includes(suffix))) {
        return this.suffixes.map((s) =>
          s ? `${base}.${s}.${ext}` : `${base}.${ext}`
        );
      }
    } else if (!fileRef) {
      module = this.remap[module] ?? module;
    }
    return [module];
  }

  private resolveModuleWithFileCache(
    resolver: ResolveHelper,
    module: string,
    containingFile: string,
    redirected?: ts.ResolvedProjectReference | undefined
  ): ts.ResolvedModuleWithFailedLookupLocations {
    let fileEntry = fileLookupMap.get(containingFile);
    if (!fileEntry) {
      fileEntry = {};
      fileLookupMap.set(containingFile, fileEntry);
    }
    if (!fileEntry[module]) {
      fileEntry[module] = resolver(module, containingFile, redirected);
    }
    return fileEntry[module];
  }

  private resolveModuleNames(
    resolver: ResolveHelper,
    names: string[],
    file: string,
    redirected: ts.ResolvedProjectReference | undefined
  ): (ts.ResolvedModuleFull | undefined)[] {
    return names.map((name) => {
      const variants = this.getModuleLookups(name);
      for (const variant of variants) {
        const resolved = this.resolveModuleWithFileCache(
          resolver,
          variant,
          file,
          redirected
        );
        if (resolved.resolvedModule) {
          return resolved.resolvedModule;
        }
      }
      return undefined;
    });
  }
}

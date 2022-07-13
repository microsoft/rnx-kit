import fs from "fs";
import { findPackage, readPackage } from "@rnx-kit/tools-node/package";
import { resolve } from "path";
import { promisify } from "util";
import { createLicenseJSON } from "./output/json";
import { createLicenseFileContents } from "./output/text";
import type {
  License,
  ModuleNamePathPair,
  SourceMap,
  SourceSection,
  WriteThirdPartyNoticesOptions,
} from "./types";

const modulesRoot = "node_modules/";

/**
 * Function to write third party notices based on the specified source map.
 *
 * This function will read the sourcemap file and tries to find all files
 * that are referenced in the sourcemap by assuming that all dependencies are
 * represented as `node_modules\moduleName` or `node_modules\@scope\moduleName`
 * It will then look in the package.json file to see if it finds a license declaration
 * or it will look for the file called `LICENCE` or `LICENSE` in the root. And aggregate all these
 * files in the output file.
 *
 * This function works for npm, yarn and pnpm package layouts formats.
 *
 * At the moment this function only supports webpack based bundles, there is nothing
 * preventing adding metro support, the current customers of this module are based on
 * webpack at the moment.
 *
 * @param options See IWriteThirdPartyNoticesOptions for more details
 */
export async function writeThirdPartyNotices(
  options: WriteThirdPartyNoticesOptions
): Promise<void> {
  const readFileAsync = promisify(fs.readFile);

  const { additionalText, json, outputFile, preambleText, sourceMapFile } =
    options;

  // Parse source map file
  const sourceMapJson = await readFileAsync(sourceMapFile, "utf8");
  const sourceMap: SourceMap = JSON.parse(sourceMapJson);

  const currentPackageId = await getCurrentPackageId(options.rootPath);

  const moduleNameToPathMap = extractModuleNameToPathMap(
    options,
    currentPackageId,
    sourceMap
  );
  const licenses = await extractLicenses(moduleNameToPathMap);
  const outputText = json
    ? createLicenseJSON(licenses)
    : createLicenseFileContents(licenses, preambleText, additionalText);

  if (outputFile) {
    const writeFileAsync = promisify(fs.writeFile);
    await writeFileAsync(outputFile, outputText, "utf8");
  } else {
    console.log(outputText);
  }
}

export async function getCurrentPackageId(
  rootPath: string
): Promise<string | undefined> {
  const pkgFile = findPackage(rootPath);
  if (pkgFile) {
    const manifest = readPackage(pkgFile);
    return manifest?.name;
  }

  return undefined;
}

// helper functions
export function normalizePath(p: string, currentPackageId?: string): string {
  let result = p.replace(/webpack:\/\/\//g, "");
  if (currentPackageId) {
    result = result.replace(
      new RegExp(`webpack://${currentPackageId}/`, "g"),
      ""
    );
  }
  return result.replace(/[\\]+/g, "/");
}

export function splitSourcePath(rootPath: string, p: string): string[] {
  //  find the root of the package, and extract the package name.
  //
  //  npm packages are laid out simply. pnpm packages have additional layers
  //  of hierarchy in the package store, such as package url and version.
  //
  //  ** example **
  //    npm:  <repo-root>/common/temp/node_modules/fbjs
  //    pnpm: <repo-root>/common/temp/node_modules/.yourProject.pkgs.visualstudio.com/fbjs/0.8.17/node_modules/fbjs

  let nodeModulesPath;
  let relativeSourcePath;

  //  bundles use WebPack's dll plugin to perform cross-bundle module retrieval.
  //  cross bundle modules' paths are appended with 'delegated ', which we need to remove from path.
  //  ** example **
  //    delegated ../../../common/temp/node_modules/.yourProject.pkgs.visualstudio.com/react-native/0.3003.5/react@16.0.0/node_modules/react-native/Libraries/EventEmitter/NativeEventEmitter.js from dll-reference runtime20
  const DELEGATED_PREFIX = "delegated ";
  if (p.startsWith(DELEGATED_PREFIX)) {
    p = p.substring(DELEGATED_PREFIX.length);
  }

  const pnpmRegExp = /(.*?node_modules\/[.].+?\/node_modules\/)(.*)/;
  const pnpmPathComponents = pnpmRegExp.exec(p);

  if (pnpmPathComponents !== null) {
    nodeModulesPath = pnpmPathComponents[1];
    relativeSourcePath = pnpmPathComponents[2];
  } else {
    nodeModulesPath = p.substring(
      0,
      p.lastIndexOf(modulesRoot) + modulesRoot.length
    );
    relativeSourcePath = p.substring(nodeModulesPath.length);
  }

  let moduleName;
  if (relativeSourcePath[0] === "@") {
    moduleName = relativeSourcePath.split("/").slice(0, 2).join("/");
  } else {
    moduleName = relativeSourcePath.split("/")[0];
  }

  return [moduleName, resolve(rootPath, `${nodeModulesPath}${moduleName}`)];
}

export function parseModule(
  options: WriteThirdPartyNoticesOptions,
  moduleNameToPath: Map<string, string>,
  p: string
): void {
  const [moduleName, modulePath] = splitSourcePath(options.rootPath, p);
  const fs = require("fs");
  if (
    (options.ignoreScopes &&
      options.ignoreScopes.some((scope: string) =>
        moduleName.startsWith(scope + "/")
      )) ||
    (options.ignoreModules &&
      options.ignoreModules.indexOf(moduleName) !== -1) ||
    !fs.existsSync(modulePath)
  ) {
    return;
  }

  moduleNameToPath.set(moduleName, modulePath);
}

export function parseSourceMap(
  options: WriteThirdPartyNoticesOptions,
  currentPackageId: string | undefined,
  moduleNameToPath: Map<string, string>,
  sourceMap: SourceMap
): void {
  sourceMap.sources.forEach((source: string) => {
    source = normalizePath(source, currentPackageId);
    if (source.includes(modulesRoot)) {
      parseModule(options, moduleNameToPath, source);
    }
  });
}

export function extractModuleNameToPathMap(
  options: WriteThirdPartyNoticesOptions,
  currentPackageId: string | undefined,
  sourceMap: SourceMap
): Map<string, string> {
  const moduleNameToPathMap = new Map<string, string>();

  if (sourceMap.sources) {
    parseSourceMap(options, currentPackageId, moduleNameToPathMap, sourceMap);
  }
  if (sourceMap.sections) {
    sourceMap.sections.forEach((section: SourceSection) => {
      parseSourceMap(
        options,
        currentPackageId,
        moduleNameToPathMap,
        section.map
      );
    });
  }

  return moduleNameToPathMap;
}

export async function extractLicenses(
  moduleNameToPathMap: Map<string, string>
): Promise<License[]> {
  const licenseExtractors = require("./extractors");

  const moduleNamePathPairs: ModuleNamePathPair[] = [];
  moduleNameToPathMap.forEach((modulePath: string, moduleName: string) => {
    // If both foo and @foo/bar exist, only include the license for foo
    if (moduleName[0] === "@") {
      const parentModuleName = moduleName.split("/")[0].substring(1);
      if (moduleNameToPathMap.has(parentModuleName)) {
        moduleNameToPathMap.delete(moduleName);
        return;
      }
    }

    moduleNamePathPairs.push({
      name: moduleName,
      path: modulePath,
    });
  });

  // Extract licenses of all modules we found
  return await licenseExtractors.nodeModule(
    moduleNamePathPairs.sort(({ name: lhs }, { name: rhs }) =>
      lhs < rhs ? -1 : lhs > rhs ? 1 : 0
    )
  );
}

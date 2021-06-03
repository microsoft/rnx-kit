import { resolve } from "path";
import os from "os";

export interface IWriteThirdPartyNoticesOptions {
  rootPath: string;
  sourceMapFile?: string;
  outputFile?: string;
  ignoreScopes?: string[];
  ignoreModules?: string[];
  preambleText?: string[];
  additionalText?: string[];
}

interface ISourceMap {
  sources: string[];
  sections?: ISourceSection[];
}

interface ISourceSection {
  map: ISourceMap;
}

interface IModuleNamePathPair {
  name: string;
  path: string;
}

export interface ILicense {
  path: string;
  licenseURLs: string[];
  licenseText?: string;
  license?: string;
  version: string;
}

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
  options: IWriteThirdPartyNoticesOptions
): Promise<void> {
  const util = require("util");
  const fs = require("fs");
  const readFileAsync = util.promisify(fs.readFile);
  const writeFileAsync = util.promisify(fs.writeFile);

  // Parse source map file
  const sourceMapJson = await readFileAsync(options.sourceMapFile, "utf8");
  const sourceMap: ISourceMap = JSON.parse(sourceMapJson);

  const moduleNameToPathMap = extractModuleNameToPathMap(options, sourceMap);
  const licenses = extractLicenses(moduleNameToPathMap);
  const outputText = createLicenseFileContents(
    moduleNameToPathMap,
    licenses,
    options.preambleText,
    options.additionalText
  );

  await writeFileAsync(options.outputFile, outputText, "utf8");
}

// helper functions
export function normalizePath(p: string): string {
  return p.replace(/webpack:\/\/\//g, "").replace(/[\\]+/g, "/");
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
      p.indexOf(modulesRoot) + modulesRoot.length
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
  options: IWriteThirdPartyNoticesOptions,
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
  options: IWriteThirdPartyNoticesOptions,
  moduleNameToPath: Map<string, string>,
  sourceMap: ISourceMap
): void {
  sourceMap.sources.forEach((source: string) => {
    source = normalizePath(source);
    if (source.includes(modulesRoot)) {
      parseModule(options, moduleNameToPath, source);
    }
  });
}

export function extractModuleNameToPathMap(
  options: IWriteThirdPartyNoticesOptions,
  sourceMap: ISourceMap
): Map<string, string> {
  const moduleNameToPathMap = new Map<string, string>();

  if (sourceMap.sources) {
    parseSourceMap(options, moduleNameToPathMap, sourceMap);
  }
  if (sourceMap.sections) {
    sourceMap.sections.forEach((section: ISourceSection) => {
      parseSourceMap(options, moduleNameToPathMap, section.map);
    });
  }

  return moduleNameToPathMap;
}

export function extractLicenses(
  moduleNameToPathMap: Map<string, string>
): ILicense[] {
  const licenseExtractors = require("browserify-licenses/app/extractors");

  const moduleNamePathPairs: IModuleNamePathPair[] = [];
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
  return licenseExtractors.nodeModule(moduleNamePathPairs);
}

export function createLicenseFileContents(
  moduleNameToPath: Map<string, string>,
  licenses: ILicense[],
  preambleText?: string[],
  additionalText?: string[]
): string {
  let outputText = "";

  const writeLine = (s: string): void => {
    outputText += `${s || ""}${os.EOL}`;
  };

  const writeMultipleLines = (s: string): void => {
    const lines = s.split(/\r\n|\r|\n/g);
    lines.forEach((line: string) => {
      writeLine(line);
    });
  };

  if (preambleText) {
    writeMultipleLines(preambleText.join(os.EOL));
  }

  // Look up licenses and emit combined license text

  Array.from(moduleNameToPath.keys())
    .sort()
    .forEach((moduleName: string) => {
      const modulePath = moduleNameToPath.get(moduleName);
      const license = licenses.find((_: ILicense) => _.path === modulePath);
      if (!license) {
        throw new Error(`Cannot find license information for ${moduleName}`);
      }
      if (!license.licenseText) {
        if (
          !license.license &&
          (!license.licenseURLs || license.licenseURLs.length === 0)
        ) {
          throw new Error(`No license text or URL for ${moduleName}`);
        }
        license.licenseText = `${license.license} (${license.licenseURLs.join(
          " "
        )})`;
      }
      writeLine("================================================");
      writeLine(`${moduleName} ${license.version}`);
      writeLine("=====");
      writeMultipleLines(license.licenseText.trim());
      writeLine("================================================");
      writeLine("");
    });

  if (additionalText) {
    writeMultipleLines(additionalText.join(os.EOL));
  }

  return outputText;
}

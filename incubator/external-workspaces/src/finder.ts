import fs from "node:fs";
import path from "node:path";
import { trace } from "./logging";
import type { DefinitionFinder, PackageDefinition } from "./types";

const jsonExt = ".json";
const nullFinder = (_pkgName: string) => null;

export function parseJsonPath(configPath: string): {
  jsonPath?: string;
  keysPath?: string;
} {
  const jsonIndex = configPath.indexOf(jsonExt);
  if (jsonIndex > 0) {
    // slice the string into ./filename.json and any characters after .json
    const jsonEndIndex = jsonIndex + jsonExt.length;
    const jsonPath = configPath.slice(0, jsonEndIndex);
    // strip off the character after .json as well so we can split on / to get the keys
    const keysPath =
      configPath.length > jsonEndIndex + 1
        ? configPath.slice(jsonEndIndex + 1)
        : "";

    return { jsonPath, keysPath };
  }
  return {};
}

/**
 * Attempt to load a definition finder from the specified config file path. This looks to see if the configPath
 * contains .json and if so it will split the string into before and after the json file, with the path after being
 * treated as a path into the .json file.
 * - './package.json/external-workspaces` : looks in the external-workspaces key in package.json
 * - './my-new.json/key1/key2             : looks two levels deep, essentially parsedJson[key1][k2y2]
 * - './another.json                      : looks in the root of the json file
 * - './src/lookup.js'                    : ignores this and returns null
 *
 * @param configPath the path to the config file
 * @returns a definition finder function if successful, or null if it is not specified
 */
export function createFinderFromJson(
  jsonPath: string,
  keysPath?: string
): DefinitionFinder | undefined {
  if (fs.existsSync(jsonPath)) {
    const keys = keysPath ? keysPath.split("/") : [];
    let deps = JSON.parse(fs.readFileSync(jsonPath, "utf8"));

    for (const key of keys) {
      deps = deps[key];
      if (!deps) {
        // return a null finder to indicate that no entries were found but it was a json file
        return nullFinder;
      }
    }
    trace(`Loaded the finder from the json file ${jsonPath}`);
    // otherwise return a finder function that will return the package definition
    return (pkgName: string) => deps[pkgName] ?? null;
  }
  return nullFinder;
}

/**
 * @returns a package definition finder provided by a JS file
 */
export function createFinderFromJs(jsPath: string): DefinitionFinder {
  const config = require(jsPath);
  if (!config) {
    throw new Error(`Unable to load config from ${jsPath}`);
  }
  trace(`Creating a finder from: ${jsPath}`);
  return config.default;
}

/**
 * This creates a finder function that will:
 * - use the config file to lookup the package definition
 * - if a path is specified:
 *  - turn the path into an absolute path
 *  - validate that a package.json file exists for the package
 * - cache the results to only do the file checks once per external workspace
 *
 * The result will be null if the package isn't found in the config file, a package definition with
 * no path specified if the package is not local, or a path if the package is local
 */
function createValidatingFinder(
  finder: DefinitionFinder,
  basePath: string
): DefinitionFinder {
  const cache = new Map<string, PackageDefinition | null>();

  return (pkgName: string) => {
    // cache the results so we don't have to read the file every time
    if (cache.has(pkgName)) {
      return cache.get(pkgName) ?? null;
    }

    // now call the base finder which will call the js function or read the parsed json
    const pkgDef = finder(pkgName);
    // copy the result so we don't modify the original object
    const result = pkgDef ? { ...pkgDef } : null;

    // if a result was found, validate the path or null it out if no local file exists
    if (result && result.path) {
      if (!path.isAbsolute(result.path)) {
        result.path = path.resolve(basePath, result.path);
      }

      // if no package.json file is found on disk for this package, clear the path
      if (!fs.existsSync(path.join(result.path, "package.json"))) {
        trace(`finder: ${pkgName} not found at ${result.path}`);
        result.path = undefined;
      } else {
        trace(`finder: ${pkgName} found at ${result.path}`);
      }
    }

    // cache the value and return the result
    cache.set(pkgName, result);
    return result;
  };
}

/**
 * Create a definition finder from the specified config file. This lookup will include checking whether it is
 * a local package or not, making sure the paths are absolute, and caching results for efficiency.
 *
 * @param configPath the path to the config file
 * @returns a finder function which will lookup package definitions, checking whether they are local along the way
 */
export function loadConfigFile(configPath: string): DefinitionFinder {
  configPath = path.resolve(process.cwd(), configPath);

  const { jsonPath, keysPath } = parseJsonPath(configPath);
  const basePath = path.dirname(jsonPath ? jsonPath : configPath);

  let baseFinder: DefinitionFinder | undefined = undefined;

  if (jsonPath) {
    // try to load it from json if the config path referenced a json file
    baseFinder = createFinderFromJson(jsonPath, keysPath);
  } else {
    // otherwise see if it is a js file that can be loaded
    const extension = path.extname(configPath).toLowerCase();
    if (extension === ".js" || extension === ".cjs") {
      baseFinder = createFinderFromJs(configPath);
    }
  }
  if (!baseFinder) {
    throw new Error(
      `Invalid external workspace config path: ${configPath}. Supported types are .json, .js, and .cjs`
    );
  }

  // return the a caching/validating wrapper around the base finder
  return createValidatingFinder(baseFinder, basePath);
}

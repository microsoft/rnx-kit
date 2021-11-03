import path from "path";
import ts from "typescript";

import { getExtensionFromPath } from "./extension";
import { resolveModule } from "./resolve";
import type { ResolverContext } from "./types";

/**
 * Search for a module file on disk. Combine each platform extension with each
 * file extension, preferring a platform override match before moving to
 * the next extension. Return as soon as an existing module file is found.
 *
 * @param context Resolver context
 * @param searchDir Directory to use when searching for the module file
 * @param modulePath Path to the module, including its base filename (no extension)
 * @param extensions List of allowed file extensions, in order from highest precedence (index 0) to lowest.
 * @returns Module file path and extension, or `undefined` if nothing was found.
 */
export function searchForModuleFile(
  context: ResolverContext,
  searchDir: string,
  modulePath: string,
  extensions: ts.Extension[]
): ts.ResolvedModuleFull | undefined {
  for (const pext of [...context.platformExtensions, ""]) {
    for (const fext of extensions) {
      const p = path.join(searchDir, `${modulePath}${pext}${fext}`);
      if (context.host.fileExists(p)) {
        return {
          resolvedFileName: p,
          extension: fext,
        };
      }
    }
  }

  return undefined;
}

/**
 * Find a file matching the given module path and set of allowed file
 * extensions.
 *
 * Most modules will not typically include a file extension:
 *
 *   "./App"
 *   "react-native"
 *   "lodash/isString"
 *
 * That's not always the case, though:
 *
 *   "./assets/Logo.png"
 *   "../app.json"
 *   "./cjs/react.development.js"
 *
 * Start the search by seeing if the module has an extension that is in the
 * list. If so, stop there, and return a path to the module file or
 * `undefined` if the file doesn't exist.
 *
 * Next, perform a more broad search. Combine each platform override with
 * each extension, preferring a platform override match before moving to the
 * next extension. Return as soon as an existing module file is found.
 *
 * If a module file was not found and the module refers to a directory,
 * repeat the search within that directory using "index" as the module name.
 * This is deliberately done after searching for the module as a file, since
 * that is a better match.
 *
 * @param context Resolver context
 * @param searchDir Directory to use when searching for the module file
 * @param modulePath Module path
 * @param extensions List of allowed file extensions, in order from highest precedence (index 0) to lowest.
 * @returns Module file path and extension, or `undefined` if nothing was found.
 */
export function findModuleFile(
  context: ResolverContext,
  searchDir: string,
  modulePath: string,
  extensions: ts.Extension[]
): ts.ResolvedModuleFull | undefined {
  const { host } = context;

  //
  //  See if the module path has an extension that is in the list. If it
  //  does, see if the path refers to a real file. Either way, return the
  //  result and stop here.
  //
  const extension = getExtensionFromPath(modulePath);
  if (extension && extensions.includes(extension)) {
    const p = path.join(searchDir, modulePath);
    return host.fileExists(p) ? { resolvedFileName: p, extension } : undefined;
  }

  let module = searchForModuleFile(context, searchDir, modulePath, extensions);
  if (!module) {
    if (extension === ts.Extension.Js || extension === ts.Extension.Jsx) {
      //
      //  The module was not found, but it has a JavaScript extension.
      //  We know, by this point, we're not looking for a JavaScript
      //  module (earlier code would have stopped the search). We are,
      //  however, looking for other file types, such as ".ts".
      //
      //  Repeat the search, without the JavaScript extension.
      //
      const modulePathNoExt = modulePath.substring(
        0,
        modulePath.length - extension.length
      );
      module = searchForModuleFile(
        context,
        searchDir,
        modulePathNoExt,
        extensions
      );
    }
  }
  if (!module) {
    //
    //  The module was not found, but it may refer to a directory name.
    //  If so, search within that directory.
    //
    const moduleDir = path.join(searchDir, modulePath);
    if (host.directoryExists(moduleDir)) {
      if (host.fileExists(path.join(moduleDir, "package.json"))) {
        //  The module path refers to a directory containing an embedded
        //  package. Start a new search from the module path (package root).
        module = resolveModule(context, moduleDir, undefined, extensions);
      } else {
        //  Search for an index file.
        module = findModuleFile(context, moduleDir, "index", extensions);
      }
    }
  }

  return module;
}

/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

const { types } = require("@babel/core");
const { declare } = require("@babel/helper-plugin-utils");
const { parseModuleRef } = require("@rnx-kit/tools-node/module");
const { readPackage } = require("@rnx-kit/tools-node/package");

/**
 * @template T
 * @typedef {import("@babel/core").NodePath<T>} NodePath;
 */

/**
 * @typedef {import("@babel/core").types.CallExpression} CallExpression;
 * @typedef {import("@babel/core").types.ExportAllDeclaration} ExportAllDeclaration;
 * @typedef {import("@babel/core").types.ExportNamedDeclaration} ExportNamedDeclaration;
 * @typedef {import("@babel/core").types.ImportDeclaration} ImportDeclaration;
 * @typedef {import("@babel/core").types.Node} Node;
 * @typedef {
 *   | NodePath<ExportAllDeclaration>
 *   | NodePath<ExportNamedDeclaration>
 *   | NodePath<ImportDeclaration>
 * } ImportExportDeclarationNodePath;
 *
 * @typedef {(moduleName: string, path?: string, requester?: string) => string} CustomRemapper;
 */

/**
 * Finds the main source file in the specified package's manifest.
 * @param {string} sourcePath
 * @param {string | undefined} requester
 * @param {CustomRemapper | undefined} customRemap
 * @returns {string | undefined}
 */
function findMainSourceFile(sourcePath, requester, customRemap) {
  const path = require("path");

  const resolveOptions = {
    paths: [requester ? path.dirname(requester) : process.cwd()],
  };
  const manifestPath = require.resolve(
    `${sourcePath}/package.json`,
    resolveOptions
  );

  const { main } = readPackage(manifestPath);
  if (customRemap) {
    return customRemap(
      sourcePath,
      typeof main === "string" ? main : undefined,
      requester
    );
  }

  if (typeof main !== "string") {
    return;
  }

  const remappedPath = `${sourcePath}/${main.replace(
    /^(?:\.\/)?lib\/(.*)\.js/,
    "src/$1.ts"
  )}`;
  try {
    const tsx = `${remappedPath}x`;
    require.resolve(tsx, resolveOptions);
    return tsx;
  } catch (_) {
    return remappedPath;
  }
}

/**
 * Replaces the source string in specified call expression.
 * @param {NodePath<CallExpression>} path
 * @param {string} source
 */
function updateCallWith(path, source) {
  const firstArgument = path.node.arguments[0];
  if (types.isStringLiteral(firstArgument)) {
    firstArgument.value = source;
  }
}

/**
 * Replaces the source string in specified import/export declaration.
 * @param {NodePath<ImportExportDeclarationNodePath>} path
 * @param {string} source
 */
function updateDeclarationWith(path, source) {
  path.node.source.value = source;
}

/**
 * @template T
 * @param {string} sourcePath
 * @param {string | undefined} requester
 * @param {NodePath<T>} path
 * @param {(path: NodePath<T>, source: string) => void} updater
 * @param {CustomRemapper | undefined} customRemap
 */
function update(sourcePath, requester, path, updater, customRemap) {
  const m = parseModuleRef(sourcePath);
  if (!("name" in m)) {
    // This is not a module reference. Ignore unless we have a custom remapper.
    if (customRemap) {
      updater(path, customRemap("", m.path, requester));
    }
    return;
  }

  const { scope, name: moduleName, path: modulePath } = m;
  if (!modulePath) {
    // Remaps @scope/example -> @scope/example/src/index.ts
    try {
      const mainSourceFile = findMainSourceFile(
        sourcePath,
        requester,
        customRemap
      );
      if (mainSourceFile) {
        updater(path, mainSourceFile);
      }
    } catch (_) {
      /* ignore */
    }
    return;
  }

  const name = scope ? `${scope}/${moduleName}` : moduleName;
  if (customRemap) {
    updater(path, customRemap(name, modulePath));
  } else if (modulePath === "lib" || modulePath.startsWith("lib")) {
    // Remaps @scope/example/lib/index.js -> @scope/example/src/index.ts
    updater(path, `${name}/${modulePath.replace("lib", "src")}`);
  }
}

module.exports = declare((api, options) => {
  api.assertVersion(7);

  /**
   * @type {{
   *   test?: (source: string) => boolean;
   *   remap?: CustomRemapper;
   * }}
   */
  const { test, remap } = options;
  if (typeof test !== "function") {
    throw new Error(
      "Expected option `test` to be a function `(source: string) => boolean`"
    );
  }
  if (remap && typeof remap !== "function") {
    throw new Error(
      "Expected option `remap` to be undefined or a function `(moduleName: string, path: string) => string`"
    );
  }

  return {
    name: "import-path-remapper",
    visitor: {
      CallExpression: (path, state) => {
        if (
          !types.isImport(path.node.callee) &&
          (!types.isIdentifier(path.node.callee) ||
            path.node.callee.name !== "require")
        ) {
          return;
        }

        const arg = path.node.arguments[0];
        const sourcePath = arg && types.isStringLiteral(arg) && arg.value;
        if (!sourcePath || !test(sourcePath)) {
          return;
        }

        update(sourcePath, state.filename, path, updateCallWith, remap);
      },

      /** @type {(path: ImportExportDeclarationNodePath, state: { filename?: string; }) => void} */
      "ImportDeclaration|ExportDeclaration": (path, state) => {
        if (!path.node.source) {
          // Ignore non-re-export lines, e.g.: export const example = () => { ... }
          return;
        }

        const sourcePath = path.node.source.value;
        if (!test(sourcePath)) {
          return;
        }

        update(sourcePath, state.filename, path, updateDeclarationWith, remap);
      },
    },
  };
});

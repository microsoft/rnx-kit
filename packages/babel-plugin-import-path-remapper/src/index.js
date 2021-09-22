/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

const { types } = require("@babel/core");
const { declare } = require("@babel/helper-plugin-utils");
const { parseModuleRef } = require("@rnx-kit/tools-node/module");

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
 */

/**
 * Finds the main source file in the specified package's manifest.
 * @param {string} sourcePath
 * @returns {string | undefined}
 */
function findMainSourceFile(sourcePath) {
  const { main } = require(`${sourcePath}/package.json`);
  if (!main) {
    return;
  }

  const remappedPath = `${sourcePath}/${main.replace(
    /^(?:\.\/)?lib\/(.*)\.js/,
    "src/$1.ts"
  )}`;
  try {
    const tsx = `${remappedPath}x`;
    require.resolve(tsx);
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
 * @param {NodePath<T>} path
 * @param {(path: NodePath<T>, source: string) => void} updater
 */
function update(sourcePath, path, updater) {
  const m = parseModuleRef(sourcePath);
  if (!("name" in m)) {
    // This is not a module reference. Ignore.
    return;
  }

  const { scope, name: moduleName, path: modulePath } = m;
  if (!modulePath) {
    // Remaps @scope/example -> @scope/example/src/index.ts
    try {
      const mainSourceFile = findMainSourceFile(sourcePath);
      if (mainSourceFile) {
        updater(path, mainSourceFile);
      }
    } catch (_) {
      /* ignore */
    }
  } else if (modulePath === "lib" || modulePath.startsWith("lib")) {
    // Remaps @scope/example/lib/index.js -> @scope/example/src/index.ts
    const name = scope ? `${scope}/${moduleName}` : moduleName;
    updater(path, `${name}/${modulePath.replace("lib", "src")}`);
  }
}

module.exports = declare((api, options) => {
  api.assertVersion(7);

  /** @type {{ test?: (source: string) => boolean; }} */
  const { test } = options;
  if (typeof test !== "function") {
    throw new Error(
      "Expected option `test` to be a function `(source: string) => boolean`"
    );
  }

  return {
    name: "import-path-remapper",
    visitor: {
      CallExpression: (path, _state) => {
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

        update(sourcePath, path, updateCallWith);
      },

      /** @type {(path: ImportExportDeclarationNodePath, state: unknown) => void} */
      "ImportDeclaration|ExportDeclaration": (path, _state) => {
        if (!path.node.source) {
          // Ignore non-re-export lines, e.g.: export const example = () => { ... }
          return;
        }

        const sourcePath = path.node.source.value;
        if (!test(sourcePath)) {
          return;
        }

        update(sourcePath, path, updateDeclarationWith);
      },
    },
  };
});

/* jshint esversion: 8, node: true */

"use strict";

const { types } = require("@babel/core");
const { declare } = require("@babel/helper-plugin-utils");

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

function replaceCallWith(path, source) {
  const expression = types.isImport(path.node.callee)
    ? types.import()
    : types.identifier("require");
  path.replaceWith(
    types.callExpression(expression, [types.stringLiteral(source)])
  );
}

function replaceDeclarationWith(path, source) {
  path.replaceWith(
    (() => {
      switch (path.node.type) {
        case "ExportAllDeclaration":
          return types.exportAllDeclaration(types.stringLiteral(source));
        case "ExportNamedDeclaration":
          return types.exportNamedDeclaration(
            path.node.declaration,
            path.node.specifiers,
            types.stringLiteral(source)
          );
        case "ImportDeclaration":
          return types.importDeclaration(
            path.node.specifiers,
            types.stringLiteral(source)
          );
        default:
          throw new Error(`Unhandled declaration type: ${path.node.type}`);
      }
    })()
  );
}

module.exports = declare((api, options) => {
  api.assertVersion(7);

  const { scope } = options;
  const re = new RegExp(`${scope}/(.*?)/lib`);

  return {
    name: "import-path-remapper",
    visitor: {
      CallExpression: (path, _state) => {
        if (
          !types.isImport(path.node.callee) &&
          path.node.callee.name !== "require"
        ) {
          return;
        }

        const sourcePath =
          path.node.arguments[0] && path.node.arguments[0].value;
        if (!sourcePath || !sourcePath.startsWith(`${scope}/`)) {
          return;
        }

        if (sourcePath.includes("/lib")) {
          // Remaps @scope/example/lib/index.js -> @scope/example/src/index.ts
          replaceCallWith(path, sourcePath.replace(re, `${scope}/$1/src`));
        } else {
          // Remaps @scope/example -> @scope/example/src/index.ts
          try {
            const mainSourceFile = findMainSourceFile(sourcePath);
            if (mainSourceFile) {
              replaceCallWith(path, mainSourceFile);
            }
          } finally {
            return;
          }
        }
      },
      "ImportDeclaration|ExportDeclaration": (path, _state) => {
        if (!path.node.source) {
          // Ignore non-re-export lines, e.g.: export const example = () => { ... }
          return;
        }

        const sourcePath = path.node.source.value;
        if (!sourcePath.startsWith(`${scope}/`)) {
          return;
        }

        if (sourcePath.includes("/lib")) {
          // Remaps @scope/example/lib/index.js -> @scope/example/src/index.ts
          replaceDeclarationWith(
            path,
            sourcePath.replace(re, `${scope}/$1/src`)
          );
        } else {
          // Remaps @scope/example -> @scope/example/src/index.ts
          try {
            const mainSourceFile = findMainSourceFile(sourcePath);
            if (mainSourceFile) {
              replaceDeclarationWith(path, mainSourceFile);
            }
          } finally {
            return;
          }
        }
      },
    },
  };
});

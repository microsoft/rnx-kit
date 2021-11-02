// @ts-check
"use strict";

/**
 * @typedef {import("@typescript-eslint/types").TSESTree.Node} Node
 * @typedef {{ exports: string[], types: string[] }} NamedExports
 */

const fs = require("fs");
const path = require("path");

const DEFAULT_CONFIG = {
  ecmaVersion: 9,
  ecmaFeatures: { globalReturn: false, jsx: true },
  sourceType: "module",
  loc: true,
  range: true,
  raw: true,
  tokens: true,
  comment: true,
  eslintVisitorKeys: true,
  eslintScopeManager: true,
};

/**
 * Returns whether there are any named exports.
 * @param {NamedExports?} namedExports
 * @returns {namedExports is null}
 */
function isEmpty(namedExports) {
  return (
    !namedExports ||
    (namedExports.exports.length === 0 && namedExports.types.length === 0)
  );
}

/**
 * Creates and returns an ES tree traverser.
 * @returns {{ break: () => void; traverse: (node: Node, options: {}) => void}}
 */
function makeTraverser() {
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  const Traverser = require(path.join(
    path.dirname(require.resolve("eslint/package.json")),
    "lib",
    "shared",
    "traverser"
  ));
  return new Traverser();
}

/**
 * Resolves specified `moduleId` relative to `fromDir`.
 * @param {string} fromDir
 * @param {string} moduleId
 * @returns {string}
 */
function resolveFrom(fromDir, moduleId) {
  if (process.env.NODE_ENV === "test") {
    return moduleId;
  }

  if (moduleId.startsWith(".")) {
    const p = path.join(fromDir, moduleId);
    const ext = [".ts", ".tsx", ".js", ".jsx"].find((ext) =>
      fs.existsSync(p + ext)
    );
    return p + ext;
  }

  return require.resolve(moduleId, { paths: [fromDir] });
}

/**
 * Parses specified file and returns an AST.
 * @param {import("eslint").Rule.RuleContext} context
 * @param {string} moduleId
 * @returns {Node | null}
 */
function parse(context, moduleId) {
  const { parseForESLint } = require(context.parserPath);
  if (typeof parseForESLint !== "function") {
    return null;
  }

  try {
    const parentDir = path.dirname(context.getFilename());
    const filePath = resolveFrom(parentDir, moduleId);
    const code = fs.readFileSync(filePath, { encoding: "utf-8" });
    return parseForESLint(code, {
      ...DEFAULT_CONFIG,
      ...context.parserOptions,
      filePath,
    }).ast;
  } catch (_) {
    /* ignore */
  }

  return null;
}

/**
 * Extracts exports from specified file.
 * @param {import("eslint").Rule.RuleContext} context
 * @param {unknown} moduleId
 * @returns {NamedExports | null}
 */
function extractExports(context, moduleId) {
  if (typeof moduleId !== "string") {
    return null;
  }

  const ast = parse(context, moduleId);
  if (!ast) {
    return null;
  }

  try {
    /** @type {NamedExports} */
    const result = { exports: [], types: [] };
    const traverser = makeTraverser();
    traverser.traverse(ast, {
      /** @type {(node: Node, parent: Node) => void} */
      enter: (node, _parent) => {
        switch (node.type) {
          case "ExportNamedDeclaration":
            if (node.declaration) {
              switch (node.declaration.type) {
                case "ClassDeclaration":
                // fallthrough
                case "FunctionDeclaration": {
                  const name = node.declaration.id?.name;
                  if (name) {
                    result.exports.push(name);
                  }
                  break;
                }

                case "TSInterfaceDeclaration":
                // fallthrough
                case "TSTypeAliasDeclaration": {
                  const name = node.declaration.id?.name;
                  if (name) {
                    result.types.push(name);
                  }
                  break;
                }

                case "VariableDeclaration":
                  node.declaration.declarations.forEach((declaration) => {
                    if (declaration.id.type === "Identifier") {
                      result.exports.push(declaration.id.name);
                    }
                  });
                  break;
              }
            } else {
              const list =
                node.exportKind === "type" ? result.types : result.exports;
              node.specifiers.forEach((spec) => {
                const name = spec.exported.name;
                if (name !== "default") {
                  list.push(name);
                }
              });
            }
            break;

          case "ExportAllDeclaration":
            traverser.break();
            return;
        }
      },
    });
    return result;
  } catch (_) {
    /* ignore */
  }

  return null;
}

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow `export *`",
      category: "Possible Errors",
      recommended: true,
      url: require("../../package.json").homepage,
    },
    fixable: "code",
    schema: [], // no options
  },
  create: (context) => {
    return {
      ExportAllDeclaration: (node) => {
        const result = extractExports(context, node.source.value);
        context.report({
          node,
          message:
            "Prefer explicit exports over `export *` to avoid name clashes, and improve tree-shakeability.",
          fix: isEmpty(result)
            ? null
            : (fixer) => {
                /** @type {string[]} */
                const lines = [];
                if (result.exports.length > 0) {
                  const names = result.exports.sort().join(", ");
                  lines.push(`export { ${names} } from ${node.source.raw};`);
                }
                if (result.types.length > 0) {
                  const types = result.types.sort().join(", ");
                  lines.push(
                    `export type { ${types} } from ${node.source.raw};`
                  );
                }
                return fixer.replaceText(node, lines.join("\n"));
              },
        });
      },
    };
  },
};

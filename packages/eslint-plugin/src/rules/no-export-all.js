// @ts-check
"use strict";

/**
 * @typedef {import("@typescript-eslint/types").TSESTree.Node} Node
 * @typedef {{ exports: string[], types: string[] }} NamedExports
 */

const fs = require("fs");
const path = require("path");

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
 * Parses specified file and returns an AST.
 * @param {import("eslint").Rule.RuleContext} context
 * @param {string} moduleName
 * @returns {Node | null}
 */
function parse(context, moduleName) {
  const { parse: esParse } = require(context.parserPath);
  if (typeof esParse !== "function") {
    return null;
  }

  try {
    const p =
      process.env.NODE_ENV === "test"
        ? moduleName
        : require.resolve(moduleName, {
            paths: [path.dirname(context.getFilename())],
          });
    const code = fs.readFileSync(p, { encoding: "utf-8" });
    return esParse(code, context.parserOptions);
  } catch (_) {
    /* ignore */
  }

  return null;
}

/**
 * Extracts exports from specified file.
 * @param {import("eslint").Rule.RuleContext} context
 * @param {unknown} moduleName
 * @returns {NamedExports | null}
 */
function extractExports(context, moduleName) {
  if (typeof moduleName !== "string") {
    return null;
  }

  const ast = parse(context, moduleName);
  if (!ast) {
    return null;
  }

  try {
    /** @type {NamedExports} */
    const result = { exports: [], types: [] };

    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    const Traverser = require("eslint/lib/shared/traverser");
    const traverser = new Traverser();
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

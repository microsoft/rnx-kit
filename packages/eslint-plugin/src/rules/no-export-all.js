// @ts-check
"use strict";

/**
 * @typedef {import("@typescript-eslint/types").TSESTree.Node} Node
 */

const fs = require("fs");
const path = require("path");

/**
 * Parses specified file and returns an AST.
 * @param {import("eslint").Rule.RuleContext} context
 * @param {string} moduleName
 */
function parse(context, moduleName) {
  const { parse } = require(context.parserPath);
  if (typeof parse !== "function") {
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
    return parse(code, context.parserOptions);
  } catch (_) {
    /* ignore */
  }

  return null;
}

/**
 * Extracts exports from specified file.
 * @param {import("eslint").Rule.RuleContext} context
 * @param {unknown} moduleName
 * @returns {{ exports: string[], types: string[] } | null}
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
    /** @type {{ exports: string[], types: string[] }} */
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
          fix: result
            ? (fixer) => {
                const names = result.exports.sort().join(", ");
                const lines = [`export { ${names} } from ${node.source.raw};`];
                if (result.types.length > 0) {
                  const types = result.types.sort().join(", ");
                  lines.push(
                    `export type { ${types} } from ${node.source.raw};`
                  );
                }
                return fixer.replaceText(node, lines.join("\n"));
              }
            : null,
        });
      },
    };
  },
};

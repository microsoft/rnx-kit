// @ts-check
"use strict";

/**
 * @typedef {import("estree").Node & { const?: boolean; }} Node
 */

/** @type {import("eslint").Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow `const enum`",
      category: "Possible Errors",
      recommended: true,
      url: require("../../package.json").homepage,
    },
  },
  create: (context) => {
    return {
      TSEnumDeclaration: (/** @type {Node} */ node) => {
        if (node.const) {
          context.report({
            node,
            message:
              "Prefer string literal unions over `const enum` to avoid bundle bloat and package boundary issues.",
          });
        }
      },
    };
  },
};

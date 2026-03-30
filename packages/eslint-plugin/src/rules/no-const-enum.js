// @ts-check
"use strict";

/**
 * @import { TSESTree } from "@typescript-eslint/types";
 * @import { Rule } from "eslint";
 */

/** @type {Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow `const enum`",
      category: "Possible Errors",
      recommended: true,
      url: require("../../package.json").homepage,
    },
    messages: {
      error:
        "Prefer string literal unions over `const enum` to avoid bundle bloat and package boundary issues.",
    },
  },
  create: (context) => {
    return {
      TSEnumDeclaration: (/** @type {TSESTree.TSEnumDeclaration} */ node) => {
        if (node.const) {
          context.report({ node, messageId: "error" });
        }
      },
    };
  },
};

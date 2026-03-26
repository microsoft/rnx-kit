// @ts-check
"use strict";

/**
 * @import { TSESTree } from "@typescript-eslint/types";
 * @import { Rule } from "eslint";
 */
const {
  isArrayType,
  isCallExpression,
  isMemberExpression,
} = require("../helpers/ast.js");

const ARRAY_METHODS = ["filter", "flatMap", "map", "reduce", "reduceRight"];

/**
 * @param {Rule.RuleContext} context
 * @param {TSESTree.Expression} node
 * @returns {boolean}
 */
function isArrayVariable(context, node) {
  if (node.type !== "Identifier") {
    return false;
  }

  const scope = context.sourceCode.getScope(node);
  const defn = scope.set.get(node.name)?.defs?.[0];

  switch (defn?.type) {
    case "Parameter": {
      return isArrayType(/** @type {TSESTree.Identifier} */ (defn.name));
    }

    case "Variable": {
      const decl = defn.node;
      if (decl.type === "VariableDeclarator") {
        return (
          isArrayType(/** @type {TSESTree.Identifier} */ (decl.id)) ||
          isArrayType(/** @type {TSESTree.Expression | null} */ (decl.init))
        );
      }
    }
  }

  return false;
}

/**
 * @param {TSESTree.Expression} node
 * @returns {node is TSESTree.MemberExpression}
 */
function isMapFilterReduce(node) {
  return (
    isMemberExpression(node) &&
    node.property.type === "Identifier" &&
    ARRAY_METHODS.includes(node.property.name)
  );
}

/** @type {Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "no unnecessary array allocations",
      category: "Possible Errors",
      recommended: true,
      url: require("../../package.json").homepage,
    },
    messages: {
      error:
        "Prefer a for-loop over chaining array methods to avoid allocating and throwing away intermediate arrays.",
    },
  },
  create: (context) => {
    /** @type {Rule.NodeListener} */
    return {
      MemberExpression: (/** @type {TSESTree.MemberExpression} */ node) => {
        // [].map().filter()
        // ~~~~~~~~~^
        if (!isMapFilterReduce(node)) {
          return;
        }

        // [].map().filter()
        // ~~~^
        const obj = node.object;
        if (!isCallExpression(obj) || !isMapFilterReduce(obj.callee)) {
          return;
        }

        // [].map().filter()
        // ^
        const callee = obj.callee.object;
        if (isArrayType(callee)) {
          context.report({ node, messageId: "error" });
          return;
        }

        // const a = [];
        // a.map().filter()
        // ^
        if (isArrayVariable(context, callee)) {
          context.report({ node, messageId: "error" });
          return;
        }
      },
    };
  },
};

// @ts-check
"use strict";

/**
 * @import { TSESTree } from "@typescript-eslint/types";
 * @import { Rule } from "eslint";
 */

const path = require("node:path");

/**
 * @param {Rule.RuleContext} context
 * @returns {boolean}
 */
function isTesting({ id }) {
  return id.startsWith("rule-to-test/");
}

/**
 * @param {Rule.RuleContext} context
 * @returns {boolean}
 */
function isTypeScriptFile({ filename }) {
  const ext = path.extname(filename);
  return ext === ".ts" || ext === ".tsx";
}

/**
 * @param {TSESTree.Node} node
 * @returns {boolean}
 */
function isTypeDefinition(node) {
  switch (node.type) {
    case "ImportDeclaration":
      return node.importKind === "type";

    case "ExportDefaultDeclaration":
    case "ExportNamedDeclaration":
      return (
        node.exportKind === "type" ||
        Boolean(node.declaration && isTypeDefinition(node.declaration))
      );

    case "TSModuleDeclaration":
      return !node.body || isTypeDefinition(node.body);

    case "TSDeclareFunction":
    case "TSInterfaceDeclaration":
    case "TSTypeAliasDeclaration":
      return true;
  }

  return false;
}

/** @type {Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow anything but type definitions",
      category: "Possible Errors",
      recommended: true,
      url: require("../../package.json").homepage,
    },
    messages: {
      error: "Invalid statement in a type definitions only module.",
    },
  },
  create: (context) => {
    if (!isTypeScriptFile(context) && !isTesting(context)) {
      return {};
    }

    /** @type {Rule.NodeListener} */
    return {
      Program: (/** @type {TSESTree.Program} **/ program) => {
        for (const statement of program.body) {
          if (!isTypeDefinition(statement)) {
            context.report({ node: statement, messageId: "error" });
          }
        }
      },
    };
  },
};

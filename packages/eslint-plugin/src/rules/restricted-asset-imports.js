// @ts-check
"use strict";

/** @import { Rule } from "eslint"; */
const { realname } = require("@rnx-kit/tools-filesystem/path");
const path = require("node:path");

const SOURCE_FILES = [
  ".cjs",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".ts",
  ".tsx",
];

/**
 * Returns whether the specified node is an import or require statement.
 * @param {Rule.Node} node
 * @returns {boolean}
 */
function isImportOrRequire(node) {
  switch (node.type) {
    case "CallExpression": {
      // const m = require(...);
      const callee = node.callee;
      return callee.type === "Identifier" && callee.name === "require";
    }
    case "ImportDeclaration": // import m from "...";
    case "ImportExpression": // const m = import(...);
      return true;
    default:
      return false;
  }
}

/**
 * @param {string} value
 * @returns {boolean}
 */
function isSourceFile(value) {
  const ext = path.extname(value);
  return !ext || SOURCE_FILES.includes(ext);
}

/** @type {Rule.RuleModule} */
module.exports = {
  meta: {
    type: "problem",
    docs: {
      description: "asset imports must follow a set of rules",
      category: "Possible Errors",
      recommended: true,
      url: require("../../package.json").homepage,
    },
    messages: {
      lowercase: "File name must be lowercase",
      lowercaseDisk: "File name must be lowercase on disk",
      mismatch: "File name does not match the file on disk",
      noSuchFile: "No such file exists",
    },
    schema: [
      {
        type: "object",
        properties: {
          extensions: { type: "array", items: { type: "string" } },
          exists: { type: "boolean" },
          lowercase: { type: "boolean" },
        },
        additionalProperties: false,
      },
    ],
  },
  create: (context) => {
    const { extensions, exists, lowercase } = context.options[0] || {};

    /** @type {Rule.NodeListener} */
    return {
      Literal: (node) => {
        const { value, parent } = node;
        if (
          typeof value !== "string" ||
          !value.startsWith("./") ||
          !isImportOrRequire(parent)
        ) {
          return;
        }

        if (Array.isArray(extensions)) {
          if (!extensions.includes(path.extname(value))) {
            return;
          }
        } else if (isSourceFile(value)) {
          return;
        }

        if (lowercase !== false && value.toLowerCase() !== value) {
          context.report({ node, messageId: "lowercase" });
        }

        if (exists !== false) {
          const p = realname(value, context.filename);
          if (!p) {
            context.report({ node, messageId: "noSuchFile" });
          } else if (lowercase !== false) {
            if (p.toLowerCase() !== p) {
              context.report({ node, messageId: "lowercaseDisk" });
            }
          } else if (p !== value) {
            context.report({ node, messageId: "mismatch" });
          }
        }
      },
    };
  },
};

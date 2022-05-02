/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

/**
 * @typedef {import("unist").Node} UnistNode
 * @typedef {UnistNode & {value?: string, children?: MdAstNode[]}} MdAstNode
 */

/**
 * Prefix which denotes an include directive.
 *
 * @type {string}
 */
const INCLUDE_PREFIX = "include ";

/**
 * Test a node to see if it is an include directive.
 *
 * @param {MdAstNode} node Node to test
 * @returns {boolean} Returns `true` if the node is an include directive, `false` otherwise.
 */
function isInclude(node) {
  const { type, value } = node;
  return type === "comment" && value?.startsWith(INCLUDE_PREFIX);
}
module.exports.isInclude = isInclude;

/**
 * Get the path of the file named in the include directive.
 *
 * @param {MdAstNode} node Include directive node
 * @returns {string} Returns the path of the file to include.
 */
function getIncludePath(node) {
  const { value } = node;
  return value.substring(INCLUDE_PREFIX.length).trim();
}
module.exports.getIncludePath = getIncludePath;

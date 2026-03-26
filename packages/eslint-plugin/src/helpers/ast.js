// @ts-check
"use strict";

/**
 * @import { TSESTree } from "@typescript-eslint/types";
 */

/**
 * @param {TSESTree.Node} node
 * @returns {node is TSESTree.CallExpression}
 */
export function isCallExpression(node) {
  return node.type === "CallExpression";
}

/**
 * @param {TSESTree.Node} node
 * @returns {node is TSESTree.ChainExpression}
 */
export function isChainExpression(node) {
  return node.type === "ChainExpression";
}

/**
 * @param {TSESTree.Node} node
 * @param {string} name
 * @returns {node is TSESTree.Identifier}
 */
export function isIdentifier(node, name) {
  return node.type === "Identifier" && node.name === name;
}

/**
 * @param {TSESTree.Node} node
 * @returns {node is TSESTree.MemberExpression}
 */
export function isMemberExpression(node) {
  return node.type === "MemberExpression";
}

/**
 * @param {TSESTree.Node} node
 * @returns {node is TSESTree.RestElement}
 */
export function isRestElement(node) {
  return node.type === "RestElement";
}

/**
 * @param {TSESTree.Node} node
 * @param {string} objectName
 * @param {string} propertyName
 * @returns {boolean}
 */
export function isSpecificMemberAccess(node, objectName, propertyName) {
  const expr = isChainExpression(node) ? node.expression : node;

  if (!isMemberExpression(expr)) {
    return false;
  }

  if (objectName && !isIdentifier(expr.object, objectName)) {
    return false;
  }

  return !expr.computed && isIdentifier(expr.property, propertyName);
}

/**
 * @param {TSESTree.Expression | null} node
 * @returns {boolean}
 */
export function isArrayType(node) {
  switch (node?.type) {
    case "ArrayExpression":
      return true;

    case "CallExpression":
      return (
        isSpecificMemberAccess(node.callee, "Array", "from") ||
        isSpecificMemberAccess(node.callee, "Array", "fromAsync")
      );

    case "Identifier":
      return node.typeAnnotation?.typeAnnotation?.type === "TSArrayType";
  }

  return false;
}

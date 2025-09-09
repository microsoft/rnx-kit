import type { Rule } from "eslint";

module.exports = {
  meta: {
    type: "problem",
    messages: {
      error:
        "When using a forEach function call, avoid using variables outside of the scope of the function, use for (const item of array) instead",
    },
    schema: [],
    docs: {
      description:
        "When using a forEach function call, avoid using variables outside of the scope of the function, use for (const item of array) instead",
    },
  },
  create(context: Rule.RuleContext) {
    const sourceCode = context.sourceCode;
    return {
      CallExpression(node) {
        if (
          node.callee.type === "MemberExpression" &&
          node.callee.property.type === "Identifier" &&
          node.callee.property.name === "forEach" &&
          node.arguments.length === 1 &&
          (node.arguments[0].type === "ArrowFunctionExpression" ||
            node.arguments[0].type === "FunctionExpression")
        ) {
          const callback = node.arguments[0];
          const callbackScope = sourceCode.getScope(callback);
          const parentScope = sourceCode.getScope(node);

          if (callbackScope && parentScope) {
            const parentScopeVariables = new Set(
              parentScope.variables.map((variable) => variable.name)
            );

            for (const reference of callbackScope.references) {
              const variableName = reference.identifier.name;
              if (
                parentScopeVariables.has(variableName) &&
                !callbackScope.set.has(variableName)
              ) {
                context.report({
                  node: callback,
                  messageId: "error",
                });
                break;
              }
            }
          }
        }
      },
    };
  },
};

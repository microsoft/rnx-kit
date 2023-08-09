/* jshint esversion: 8, node: true */
// @ts-check
"use strict";

const { types: t } = require("@babel/core");
const { declare } = require("@babel/helper-plugin-utils");
const { default: babelTemplate } = require("@babel/template");

module.exports = declare((api) => {
  api.assertVersion(7);

  const pluginName = "@react-native-webapis/polyfills";

  /** @type {string | null} */
  let isPolyfilled = null;

  return {
    name: pluginName,
    visitor: {
      Program: (path, context) => {
        const leadingComments = path.node.body[0]?.leadingComments;
        const codegen = leadingComments?.some((comment) => {
          const normalizedComment = comment.value.trim().split(" ")[0].trim();
          return normalizedComment.startsWith("@react-native-webapis");
        });

        if (!codegen) {
          return;
        }

        if (isPolyfilled != null) {
          throw new Error(
            `'${pluginName}' is already applied to ${isPolyfilled}`
          );
        }

        isPolyfilled = context.file.opts.filename ?? "<unnamed module>";

        const { getDependencyPolyfills } = require("./lib/dependency");
        const polyfills = getDependencyPolyfills({ projectRoot: context.cwd });

        const importPolyfill = babelTemplate(`import %%source%%;`);

        for (const polyfill of polyfills) {
          path.unshiftContainer(
            "body",
            importPolyfill({ source: t.stringLiteral(polyfill) })
          );
        }
      },
    },
  };
});

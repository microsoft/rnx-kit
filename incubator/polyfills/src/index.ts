import type { ConfigAPI } from "@babel/core";
import { types as t } from "@babel/core";
import { declare } from "@babel/helper-plugin-utils";
import babelTemplate from "@babel/template";
import { getDependencyPolyfills } from "./dependency";

module.exports = declare((api: ConfigAPI) => {
  api.assertVersion(7);
  return {
    name: "@rnx-kit/polyfills",
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

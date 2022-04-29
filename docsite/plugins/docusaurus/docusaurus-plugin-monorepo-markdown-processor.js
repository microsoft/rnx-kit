const path = require("path");
const mdastUtilRemoveBlock = require("../remark/mdast-util-remove-block");

async function plugin(context, _opts) {
  const { siteDir, siteConfig } = context;
  const inclusionPath = path.resolve(siteDir, "../packages") + path.sep;

  return {
    name: "docusaurus-plugin-monorepo-markdown-processor",
    configureWebpack(config, isServer, utils, _content) {
      return {
        module: {
          rules: [
            {
              test: /\.mdx?$/i,
              include: inclusionPath,
              use: [
                utils.getJSLoader({ isServer }),
                {
                  loader: require.resolve("@docusaurus/mdx-loader"),
                  options: {
                    staticDirs: siteConfig.staticDirectories.map((dir) =>
                      path.resolve(siteDir, dir)
                    ),
                    siteDir,
                    isMDXPartial: () => true,
                    isMDXPartialFrontMatterWarningDisabled: true,
                    remarkPlugins: [mdastUtilRemoveBlock],
                  },
                },
              ],
            },
          ],
        },
      };
    },
  };
}
module.exports = plugin;

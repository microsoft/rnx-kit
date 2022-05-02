/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check

/** @type {import('@docusaurus/plugin-content-docs').SidebarsConfig} */
const sidebars = {
  docsSidebar: [
    {
      type: "category",
      label: "The Basics",
      items: ["introduction", "dependencies", "type-safety"],
    },
    {
      type: "category",
      label: "Guides",
      items: [
        "guides/getting-started",
        "guides/dependency-management",
        "guides/bundling",
      ],
    },
  ],

  toolsSidebar: [
    {
      type: "category",
      label: "Tools",
      items: [
        "tools/overview",
        "tools/babel-plugin-import-path-remapper",
        "tools/babel-preset-metro-react-native",
        "tools/bundle-diff",
        "tools/cli",
        "tools/config",
        "tools/dep-check",
        "tools/esbuild-plugin-import-path-remapper",
        "tools/eslint-plugin",
        "tools/golang",
        "tools/jest-preset",
        "tools/metro-config",
        "tools/metro-plugin-cyclic-dependencies-detector",
        "tools/metro-plugin-duplicates-checker",
        "tools/metro-resolver-symlinks",
        "tools/metro-serializer",
        "tools/metro-serializer-esbuild",
        "tools/react-native-auth",
        "tools/react-native-lazy-index",
        "tools/react-native-test-app-msal",
        "tools/third-party-notices",
        "tools/tools-language",
        "tools/tools-node",
        "tools/tools-react-native",
        "tools/typescript-react-native-compiler",
        "tools/typescript-react-native-resolver",
        "tools/typescript-service",
      ],
    },
  ],

  architectureSidebar: [
    {
      type: "category",
      label: "Architecture",
      items: ["architecture/overview", "architecture/dependency-management"],
    },
  ],
};

module.exports = sidebars;

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
        "packages/overview",
        "packages/babel-plugin-import-path-remapper",
        "packages/babel-preset-metro-react-native",
        "packages/bundle-diff",
        "packages/cli",
        "packages/config",
        "packages/dep-check",
        "packages/esbuild-plugin-import-path-remapper",
        "packages/eslint-plugin",
        "packages/golang",
        "packages/jest-preset",
        "packages/metro-config",
        "packages/metro-plugin-cyclic-dependencies-detector",
        "packages/metro-plugin-duplicates-checker",
        "packages/metro-resolver-symlinks",
        "packages/metro-serializer",
        "packages/metro-serializer-esbuild",
        "packages/react-native-auth",
        "packages/react-native-lazy-index",
        "packages/react-native-test-app-msal",
        "packages/third-party-notices",
        "packages/tools-language",
        "packages/tools-node",
        "packages/tools-react-native",
        "packages/typescript-react-native-compiler",
        "packages/typescript-react-native-resolver",
        "packages/typescript-service",
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

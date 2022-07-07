/**
 * Creating a sidebar enables you to:
 - create an ordered group of docs
 - render a sidebar for each doc of that group
 - provide next/previous navigation

 The sidebars can be generated from the filesystem, or explicitly defined here.

 Create as many sidebars as you want.
 */

// @ts-check
const fs = require("node:fs");
const path = require("node:path");

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
        ...fs
          .readdirSync(path.join(__dirname, "docs", "tools"))
          .filter((file) => file !== "overview.mdx" && file.endsWith(".mdx"))
          .sort()
          .map((file) => `tools/${path.basename(file, ".mdx")}`),
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

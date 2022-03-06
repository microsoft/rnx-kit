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
      label: "Tutorial: Basics",
      items: [
        "tutorial-basics/intro",
        "tutorial-basics/create-a-page",
        "tutorial-basics/create-a-document",
        "tutorial-basics/create-a-blog-post",
        "tutorial-basics/markdown-features",
        "tutorial-basics/deploy-your-site",
        "tutorial-basics/congratulations",
      ],
    },
    {
      type: "category",
      label: "Tutorial: Extras",
      items: [
        "tutorial-extras/manage-docs-versions",
        "tutorial-extras/translate-your-site",
      ],
    },
  ],

  apiSidebar: [
    {
      type: "category",
      label: "Package APIs",
      items: ["babel-plugin-import-path-remapper"],
    },
  ],

  architectureSidebar: [
    {
      type: "category",
      label: "Architecture",
      items: ["architecture-overview"],
    },
  ],
};

module.exports = sidebars;

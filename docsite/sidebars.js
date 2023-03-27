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

function generateToolsSidebar() {
  const items = [];
  const workspace = path.join("..", "packages");
  for (const pkg of fs.readdirSync(workspace)) {
    const manifest = path.join(workspace, pkg, "package.json");
    const readme = path.join(workspace, pkg, "README.md");
    if (!fs.existsSync(manifest) || !fs.existsSync(readme)) {
      continue;
    }

    const content = fs.readFileSync(manifest, { encoding: "utf-8" });
    if (JSON.parse(content).private) {
      continue;
    }

    const output = path.join("docs", "tools", `${pkg}.mdx`);
    if (!fs.existsSync(output)) {
      const mdx = [`# ${pkg}`, "", `<!--include ../../${readme}-->`, ""];
      fs.writeFileSync(output, mdx.join("\n"));
    }

    items.push(`tools/${path.basename(pkg, ".mdx")}`);
  }
  return items.sort();
}

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
      items: ["tools/overview", ...generateToolsSidebar()],
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

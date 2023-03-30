// @ts-check
const fs = require("node:fs");
const path = require("node:path");

const badges = [
  "https://github.com/microsoft/rnx-kit/actions/workflows",
  "https://img.shields.io",
].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

const badgesRE = new RegExp(
  `(?:\\[!\\[.*?\\]\\((?:${badges.join("|")}).*?\\)\\]\\(https:.*?\\)\\s*)*`,
  "g"
);

const titleRE = /# @rnx-kit\/(.*)/;

function copyContributing() {
  const contributing = "CONTRIBUTING.md";
  fs.copyFileSync(
    path.join("..", contributing),
    path.join("docs", contributing.toLowerCase()),
    fs.constants.COPYFILE_FICLONE
  );
}

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

    const output = path.join("docs", "tools", `${pkg}.md`);
    if (!fs.existsSync(output)) {
      const content = fs.readFileSync(readme, { encoding: "utf-8" });
      fs.writeFileSync(
        output,
        content
          .replace(titleRE, "# $1") // Remove scope from title
          .replace(badgesRE, "") // Remove badges
      );
    }

    items.push(`tools/${path.basename(pkg, ".md")}`);
  }
  return items.sort();
}

function generateAll() {
  copyContributing();
  generateToolsSidebar();
}

generateAll.copyContributing = copyContributing;
generateAll.generateToolsSidebar = generateToolsSidebar;

module.exports = generateAll;

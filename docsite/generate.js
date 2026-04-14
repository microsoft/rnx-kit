// @ts-check
const fs = require("node:fs");
const path = require("node:path");

const UTF_8 = /** @type {const} */ ({ encoding: "utf-8" });

const badges = [
  "https://github\\.com/microsoft/rnx-kit/actions/workflows",
  "https://img\\.shields\\.io",
].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

const badgesRE = new RegExp(
  `(?:\\[!\\[.*?\\]\\((?:${badges.join("|")}).*?\\)\\]\\(https:.*?\\)\\s*)*`,
  "g"
);

const localImagesRE = /!\[(.*?)\]\(\.\/(.*?)\)/g;
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

    if (JSON.parse(fs.readFileSync(manifest, UTF_8)).private) {
      continue;
    }

    const output = path.join("docs", "tools", `${pkg}.md`);
    if (!fs.existsSync(output)) {
      const content = fs.readFileSync(readme, UTF_8);
      fs.writeFileSync(
        output,
        content
          .replace(titleRE, "# $1") // Remove scope from title
          .replace(badgesRE, "") // Remove badges
          .replace(
            localImagesRE,
            `![$1](${path.join("..", "..", path.dirname(readme), "$2")})`
          )
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

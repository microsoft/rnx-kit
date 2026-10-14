// @ts-check
import * as fs from "node:fs";
import * as path from "node:path";

const UTF_8 = /** @type {const} */ ({ encoding: "utf-8" });

const docsDir = path.join("src", "content", "docs", "docs");

const badges = [
  "https://github\\.com/microsoft/rnx-kit/actions/workflows",
  "https://img\\.shields\\.io",
].map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

const badgesRE = new RegExp(
  `(?:\\[!\\[.*?\\]\\((?:${badges.join("|")}).*?\\)\\]\\(https:.*?\\)\\s*)*`,
  "g"
);

const localImagesRE = /!\[(.*?)\]\(\.\/(.*?)\)/g;
const titleRE = /^# (?:@rnx-kit\/)?(.*)\n+/m;

/**
 * Moves the first heading into front matter as required by Starlight.
 * @param {string} content
 * @returns {string}
 */
function toPage(content) {
  const match = content.match(titleRE);
  if (!match) {
    throw new Error("Missing title");
  }
  const title = JSON.stringify(match[1].trim());
  return `---\ntitle: ${title}\n---\n\n${content.replace(titleRE, "")}`;
}

function copyContributing() {
  const content = fs.readFileSync(path.join("..", "CONTRIBUTING.md"), UTF_8);
  fs.writeFileSync(path.join(docsDir, "contributing.md"), toPage(content));
}

function generateTools() {
  const toolsDir = path.join(docsDir, "tools");
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

    const output = path.join(toolsDir, `${pkg}.md`);
    if (!fs.existsSync(output)) {
      const imagesDir = path.posix.relative(toolsDir, path.dirname(readme));
      const content = fs
        .readFileSync(readme, UTF_8)
        .replace(badgesRE, "") // Remove badges
        .replace(localImagesRE, `![$1](${imagesDir}/$2)`);
      fs.writeFileSync(output, toPage(content));
    }
  }
}

export function generateAll() {
  copyContributing();
  generateTools();
}

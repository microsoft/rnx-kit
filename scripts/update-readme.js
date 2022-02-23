const fs = require("fs");
const markdownTable = require("markdown-table");
const path = require("path");
const { getAllPackageJsonFiles, getWorkspaceRoot } = require("workspace-tools");

const PACKAGE_JSON = "package.json";
const README = "README.md";
const TOKEN_START = "<!-- @rnx-kit start -->";
const TOKEN_END = "<!-- @rnx-kit end -->";

function readFile(path) {
  return fs.readFileSync(path, { encoding: "utf-8" });
}

const repoUrl = (() => {
  const manifest = JSON.parse(readFile(PACKAGE_JSON));
  return manifest.repository.url.replace(/\.git$/, "");
})();

const repoRoot = getWorkspaceRoot();
const packages = getAllPackageJsonFiles(repoRoot)
  .filter((p) => !p.includes("packages/draft-"))
  .reduce((packages, manifestPath) => {
    const content = readFile(manifestPath);
    const manifest = JSON.parse(content);
    const { private, name, description } = manifest;
    if (!private && !name.startsWith("@types/")) {
      const packagePath = path.relative(repoRoot, path.dirname(manifestPath));
      const link = `[${name}](${repoUrl}/tree/main/${packagePath})`;
      packages.push([link, description]);
    }
    return packages;
  }, []);

const table = markdownTable([["Name", "Description"], ...packages]);

const readme = readFile(README);
const updatedReadme = readme.replace(
  new RegExp(`${TOKEN_START}([^]+)${TOKEN_END}`),
  `${TOKEN_START}\n\n${table}\n\n${TOKEN_END}`
);

if (updatedReadme !== readme) {
  fs.writeFileSync(README, updatedReadme);
}

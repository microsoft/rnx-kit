const fs = require("fs");
const markdownTable = require("markdown-table");
const path = require("path");

const PACKAGE_JSON = "package.json";
const PACKAGES = "packages";
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

const packages = fs.readdirSync(PACKAGES).reduce((packages, packageDir) => {
  const packagePath = path.join(PACKAGES, packageDir);
  const manifestPath = path.join(packagePath, PACKAGE_JSON);
  const content = readFile(manifestPath);
  const manifest = JSON.parse(content);
  if (!manifest["private"]) {
    const { name, description } = manifest;
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

const fs = require("fs");
const markdownTable = require("markdown-table");
const path = require("path");
const { getAllPackageJsonFiles, getWorkspaceRoot } = require("workspace-tools");

const PACKAGE_JSON = "package.json";
const README = "README.md";
const TOKEN_START = "<!-- @rnx-kit start -->";
const TOKEN_END = "<!-- @rnx-kit end -->";
const TOKEN_EXPERIMENTAL_START = "<!-- @rnx-kit experimental start -->";
const TOKEN_EXPERIMENTAL_END = "<!-- @rnx-kit experimental end -->";

function readFile(path) {
  return fs.readFileSync(path, { encoding: "utf-8" });
}

const repoUrl = (() => {
  const manifest = JSON.parse(readFile(PACKAGE_JSON));
  return manifest.repository.url.replace(/\.git$/, "");
})();

const repoRoot = getWorkspaceRoot();
const experimentalPackages = [];
const packages = getAllPackageJsonFiles(repoRoot).reduce(
  (packages, manifestPath) => {
    const content = readFile(manifestPath);
    const manifest = JSON.parse(content);
    const { private, name, description, experimental } = manifest;
    if (!private && !name.startsWith("@types/")) {
      const packagePath = path.relative(repoRoot, path.dirname(manifestPath));
      const link = `[${name}](${repoUrl}/tree/main/${packagePath})`;
      if (experimental) {
        experimentalPackages.push([link, description.substring(34)]);
      } else {
        packages.push([link, description]);
      }
    }
    return packages;
  },
  []
);

const table = markdownTable([["Name", "Description"], ...packages]);
const experimentalTable = markdownTable([
  ["Name", "Description"],
  ...experimentalPackages,
]);

const readme = readFile(README);

const updatedMainTableReadme = readme.replace(
  new RegExp(`${TOKEN_START}([^]+)${TOKEN_END}`),
  `${TOKEN_START}\n\n${table}\n\n${TOKEN_END}`
);

const fullyUpdatedReadme = updatedMainTableReadme.replace(
  new RegExp(`${TOKEN_EXPERIMENTAL_START}([^]+)${TOKEN_EXPERIMENTAL_END}`),
  `${TOKEN_EXPERIMENTAL_START}\n\n${experimentalTable}\n\n${TOKEN_EXPERIMENTAL_END}`
);

if (fullyUpdatedReadme !== readme) {
  fs.writeFileSync(README, fullyUpdatedReadme);
}

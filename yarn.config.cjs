// @ts-check

/** @type {import("@yarnpkg/types")} */
const { defineConfig } = require("@yarnpkg/types");

const IGNORED_LOCATIONS = [
  ".",
  "packages/test-app",
  "packages/test-app-macos",
  "packages/test-app-windows",
  "scripts",
];

module.exports = defineConfig({
  constraints: async ({ Yarn }) => {
    const root = Yarn.workspace({ cwd: "." });
    if (!root) {
      throw new Error("Root workspace not found");
    }

    const { author, repository: origin } = root.manifest;

    for (const workspace of Yarn.workspaces()) {
      if (IGNORED_LOCATIONS.includes(workspace.cwd)) {
        continue;
      }

      workspace.set("author.name", author.name);
      workspace.set("author.email", author.email);

      const homepage = `${origin.url}/tree/main/${workspace.cwd}#readme`;
      workspace.set("homepage", homepage);

      workspace.set("repository.type", origin.type);
      workspace.set("repository.url", origin.url);
      workspace.set("repository.directory", workspace.cwd);
    }
  },
});

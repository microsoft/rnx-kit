// @ts-check

/** @type {import("@yarnpkg/types")} */
const { defineConfig } = require("@yarnpkg/types");

module.exports = defineConfig({
  constraints: async ({ Yarn }) => {
    const root = Yarn.workspace({ cwd: "." });
    if (!root) {
      throw new Error("Root workspace not found");
    }

    const { author, repository: origin } = root.manifest;

    for (const workspace of Yarn.workspaces()) {
      const { private: isPrivate, experimental } = workspace.manifest;
      if (isPrivate && !experimental) {
        workspace.set("version", "0.0.0");
      }

      workspace.set("author.name", author.name);
      workspace.set("author.email", author.email);

      const homepage =
        workspace === root
          ? `${origin.url}#readme`
          : `${origin.url}/tree/main/${workspace.cwd}#readme`;
      workspace.set("homepage", homepage);

      workspace.set("repository.type", origin.type);
      workspace.set("repository.url", origin.url);

      if (workspace !== root) {
        workspace.set("repository.directory", workspace.cwd);
      }
    }
  },
});

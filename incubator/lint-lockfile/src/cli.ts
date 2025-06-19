import { loadWorkspace } from "./workspace.ts";

function main() {
  const workspace = loadWorkspace();

  const errors: string[] = [];
  const context = {
    get packages() {
      // Lazy load the packages to avoid unnecessary file system access
      return workspace.packages;
    },
    report: (e: string) => {
      errors.push(e);
    },
  };

  for (const [key, pkg] of Object.entries(workspace.lockfile)) {
    for (const rule of workspace.rules) {
      rule(context, key, pkg);
    }
  }

  const numErrors = errors.length;
  if (numErrors > 0) {
    process.exitCode = numErrors;
    console.error(errors.join("\n"));
  }
}

main();

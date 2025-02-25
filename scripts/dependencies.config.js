import * as fs from "node:fs";
import * as path from "node:path";
import { URL } from "node:url";

function always() {
  return true;
}

function lookForFile(filename) {
  return (cwd) => fs.existsSync(path.join(cwd, filename));
}

function needsJest(cwd, manifest) {
  return "jest" in manifest || fs.existsSync(path.join(cwd, "jest.config.js"));
}

const COMMON_DEPENDENCIES = [
  ["eslint", lookForFile("eslint.config.js")],
  ["jest", needsJest],
  ["prettier", always],
  ["typescript", lookForFile("tsconfig.json")],
];

const getDependencyVersion = (() => {
  let deps;
  return (name) => {
    if (!deps) {
      const url = new URL("package.json", import.meta.url);
      const manifest = fs.readFileSync(url, { encoding: "utf-8" });
      deps = JSON.parse(manifest)["dependencies"];
    }

    return deps[name];
  };
})();

/* eslint-disable-next-line no-restricted-exports */
export default function ({ cwd, manifest }) {
  let extensions = undefined;

  for (const [pkg, test] of COMMON_DEPENDENCIES) {
    if (test(cwd, manifest)) {
      extensions ||= { dependencies: {} };
      extensions.dependencies[pkg] = getDependencyVersion(pkg);
    }
  }

  return extensions;
}

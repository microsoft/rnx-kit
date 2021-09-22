import { addResolvePath, option, parallel, series, task } from "just-scripts";
import { clean } from "./tasks/clean";
import { depcheck } from "./tasks/depcheck";
import { eslint } from "./tasks/eslint";
import { jest } from "./tasks/jest";
import { prettier } from "./tasks/prettier";
import { ts } from "./tasks/ts";
import { updateApiReadme } from "./tasks/updateApiReadme";

export function configureJust(): void {
  //  add a resolve path for the build tooling deps like TS from the scripts folder
  addResolvePath(__dirname);

  option("production");

  // for options that have a check/fix switch this puts them into fix mode
  option("fix");

  // leaf-level task definitions
  task("clean", clean);
  task("depcheck", depcheck);
  task("lint", eslint);
  task("jest", jest);
  task("no-op", () => undefined);
  task("prettier", prettier);
  task("ts", ts);

  // hierarchical task definintions
  task("build", ts);
  task("code-style", series("prettier", "lint"));
  task("format", prettier);
  task("update-api-readme", updateApiReadme);
  task("test", jest);
  task("validate", parallel("depcheck", "lint", "test"));
}

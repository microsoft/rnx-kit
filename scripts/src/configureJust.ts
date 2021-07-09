import { addResolvePath, option, parallel, series, task } from "just-scripts";
import { clean } from "./tasks/clean";
import { depcheck } from "./tasks/depcheck";
import { eslint } from "./tasks/eslint";
import { jest } from "./tasks/jest";
import { prettier } from "./tasks/prettier";
import { ts } from "./tasks/ts";

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
  task("build", series("clean", "depcheck", "lint", "ts"));
  task("code-style", series("prettier", "lint"));
  task("format", prettier);
  task("test", jest);
  task("validate", parallel("depcheck", "lint", "test"));
}

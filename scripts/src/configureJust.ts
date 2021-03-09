import {
  task,
  series,
  parallel,
  option,
  argv,
  addResolvePath,
  prettierCheckTask,
  prettierTask,
} from "just-scripts";

import { clean } from "./tasks/clean";
import { depcheck } from "./tasks/depcheck";
import { eslint } from "./tasks/eslint";
import { jest } from "./tasks/jest";
import { ts } from "./tasks/ts";

export function configureJust() {
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
  task("no-op", () => {});
  task("prettier", () => (argv().fix ? prettierTask : prettierCheckTask));
  task("ts", ts);

  // hierarchical task definintions
  task("build", series("clean", "lint", "ts"));
  task("code-style", series("prettier", "lint"));
  task("test", jest);
  task("validate", parallel("lint", "test"));
}

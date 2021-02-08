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
import { metro } from "./tasks/metro";
import { ts } from "./tasks/ts";

export function configureJust() {
  //  add a resolve path for the build tooling deps like TS from the scripts folder
  addResolvePath(__dirname);

  option("production");

  //  metro options
  option("dev");
  option("platform", { string: true });
  option("bundleName", { string: true });
  option("server");
  option("port", { number: true });
  option("cli");

  // for options that have a check/fix switch this puts them into fix mode
  option("fix");

  // leaf-level task definitions
  task("clean", clean);
  task("depcheck", depcheck);
  task("lint", eslint);
  task("jest:default", jest.default);
  task("jest:ios", jest.ios);
  task("jest:android", jest.android);
  task("jest:macos", jest.macos);
  task("jest:win32", jest.win32);
  task("jest:windows", jest.windows);
  task("metro", () => metro);
  task("no-op", () => {});
  task("prettier", () => (argv().fix ? prettierTask : prettierCheckTask));
  task("ts", ts);

  // hierarchical task definintions
  task("bundle", series("metro"));
  task("build", series("clean", "lint", "ts"));
  task("code-style", series("prettier", "lint"));
  task(
    "jest:platforms",
    parallel(
      "jest:ios",
      "jest:android",
      "jest:macos",
      "jest:win32",
      "jest:windows"
    )
  );
  task("test", series("jest:default", "jest:platforms"));
  task("validate", parallel("lint", "test"));
}

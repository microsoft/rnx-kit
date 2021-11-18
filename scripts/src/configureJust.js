// @ts-check

const { goBuildTask, goTask } = require("@rnx-kit/golang");
const path = require("path");
const {
  addResolvePath,
  option,
  parallel,
  series,
  task,
  logger,
} = require("just-scripts");
const { build } = require("./tasks/build");
const { bundle } = require("./tasks/bundle");
const { clean } = require("./tasks/clean");
const { depcheck } = require("./tasks/depcheck");
const { eslint } = require("./tasks/eslint");
const { jest } = require("./tasks/jest");
const { prettier } = require("./tasks/prettier");
const { ts } = require("./tasks/ts");
const { updateApiReadme } = require("./tasks/updateApiReadme");

const scriptsBinDir = path.join(__dirname, "..", "bin");

function configureJust() {
  //  add a resolve path for the build tooling deps like TS from the scripts folder
  addResolvePath(__dirname);

  option("production");

  // for options that have a check/fix switch this puts them into fix mode
  option("fix");

  // leaf-level task definitions
  task("clean", clean);
  task("bundle", bundle);
  task("depcheck", depcheck);
  task("lint", eslint);
  task("jest", jest);
  task("no-op", () => undefined);
  task("prettier", prettier);
  task("ts", ts);
  task("go:build", goBuildTask(logger));

  task(
    "hello",
    goTask(logger, path.join(scriptsBinDir, "hello"), "a", "b", "c")
  );

  // hierarchical task definintions
  task("build", build("clean", "go:build", "depcheck", "lint", "ts"));
  task("code-style", series("prettier", "lint"));
  task("format", prettier);
  task("update-api-readme", updateApiReadme);
  task("test", jest);
  task("validate", parallel("depcheck", "lint", "test"));
}

exports.configureJust = configureJust;

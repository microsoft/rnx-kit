// @ts-check

const {
  task,
  series,
  option,
  argv,
  tscTask,
  cleanTask,
  eslintTask,
  logger,
} = require("just-scripts");

const path = require("path");

const { goInstallTask, goBuildTask } = require("@rnx-kit/golang");

const srcPath = path.join(process.cwd(), "src");
const libPath = path.join(process.cwd(), "lib");
const binPath = path.join(process.cwd(), "bin");

const checkPublishing = () => {
  const { checkPublishingTask } = require("./src/tasks/checkPublishingTask");
  return checkPublishingTask();
};

module.exports = function preset() {
  option("production");

  task("cleanlib", cleanTask({ paths: [binPath, libPath] }));
  task("depcheck", checkPublishing);
  task("format", require("./src/tasks/prettier").prettier);

  task("go:build", goBuildTask(logger));
  task("go:install", goInstallTask(logger));
  task("go", series("go:install", "go:build"));

  task("lint", eslintTask({ files: ["src/*"] }));

  task("no-op", () => undefined);

  task(
    "ts",
    tscTask({
      pretty: true,
      allowJs: true,
      target: "es6",
      outDir: "lib",
      module: "commonjs",
      ...(argv().production && {
        inlineSources: true,
        sourceRoot: path.relative(libPath, srcPath),
      }),
    })
  );

  if (process.env["CI_SKIP_GO"]) {
    task("build", series("cleanlib", "lint", "ts"));
  } else {
    task("build", series("cleanlib", "go", "lint", "ts"));
  }
  task("clean", "no-op");
};

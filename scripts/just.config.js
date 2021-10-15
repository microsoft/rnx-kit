// @ts-check

const {
  task,
  series,
  option,
  argv,
  tscTask,
  cleanTask,
  eslintTask,
} = require("just-scripts");

const path = require("path");

const { goInstallTask, goBuildTask } = require("./src/tasks/go");

const srcPath = path.join(process.cwd(), "src");
const libPath = path.join(process.cwd(), "lib");
const binPath = path.join(process.cwd(), "bin");

const checkPublishing = () => {
  const { checkPublishingTask } = require("./lib/tasks/checkPublishingTask");
  return checkPublishingTask();
};

module.exports = function preset() {
  option("production");

  task("cleanlib", cleanTask({ paths: [binPath, libPath] }));
  task("eslint", eslintTask({ files: ["src/*"] }));

  task("go:install", goInstallTask());
  task("go:build", goBuildTask());
  task("go", series("go:install", "go:build"));

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
  task("depcheck", checkPublishing);
  task("no-op", () => {});

  if (process.env["CI_SKIP_GO"]) {
    task("build", series("cleanlib", "eslint", "ts"));
  } else {
    task("build", series("cleanlib", "go", "eslint", "ts"));
  }
  task("clean", "no-op");
};

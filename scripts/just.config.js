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

const srcPath = path.join(process.cwd(), "src");
const libPath = path.join(process.cwd(), "lib");

const checkPublishing = () => {
  const { checkPublishingTask } = require("./lib/tasks/checkPublishingTask");
  return checkPublishingTask();
};

module.exports = function preset() {
  option("production");

  task("cleanlib", cleanTask({ paths: [libPath] }));
  task("eslint", eslintTask({ files: ["src/*"] }));
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

  task("build", series("cleanlib", "eslint", "ts"));
  task("clean", "no-op");
};

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

module.exports = function configureJustForBuildTools() {
  option("production");

  task("clean", cleanTask({ paths: [libPath] }));
  task("depcheck", checkPublishing);
  task("lint", eslintTask({ files: ["src/."] }));
  task(
    "ts",
    tscTask({
      outDir: "lib",
      ...(argv().production && {
        inlineSources: true,
        sourceRoot: path.relative(libPath, srcPath),
      }),
    })
  );

  task("build-tools", series("clean", "lint", "ts"));
};

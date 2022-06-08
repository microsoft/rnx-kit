"use strict";

/**
 * @typedef {import("nx/src/tasks-runner/default-tasks-runner").DefaultTasksRunnerOptions} DefaultTasksRunnerOptions
 * @typedef {import("nx/src/tasks-runner/tasks-runner").TasksRunner} TasksRunner
 *
 * @type {TasksRunner<DefaultTasksRunnerOptions>}
 */
module.exports = (tasks, options, context) => {
  if (options.parallel === 0) {
    const numCpus = require("os").cpus().length;
    if (process.env.CI) {
      options.parallel = Math.max(numCpus, 1);
      console.log(`Using ${options.parallel} cores`);
    } else {
      // Don't use all cores to keep the computer somewhat responsive
      options.parallel = Math.max(numCpus - 1, 1);
    }
  }
  const { default: defaultTasksRunner } = require("nx/tasks-runners/default");
  return defaultTasksRunner(tasks, options, context);
};

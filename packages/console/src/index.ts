import chalk from "chalk";

type Log = typeof console.log;

export const error: Log = (...args) =>
  console.error(chalk.red.bold("error"), ...args);

export const info: Log = (...args) =>
  console.log(chalk.cyan.bold("info"), ...args);

export const warn: Log = (...args) =>
  console.warn(chalk.yellow.bold("warn"), ...args);

import chalk from "chalk";
import { stripVTControlCharacters } from "node:util";
import type { Formatter } from "./types.js";

function identity<T>(x: T): T {
  return x;
}

export const defaultFormatter: Formatter = {
  module: (moduleName: string) => formatModuleName(moduleName),
  path: (path: string) => chalk.blue(path),
  duration: (duration: number) => formatDuration(duration),
  task: (task: string) => chalk.bold(chalk.green(task)),
  action: (action: string) => chalk.cyan(action),
  reporter: (reporter: string) => chalk.bold(chalk.blue(reporter)),

  // formatting functions for types of logging
  log: (text: string) => identity(text),
  error: (text: string) => chalk.red(`Error: `) + text,
  warn: (text: string) => chalk.yellow(`Warning: `) + text,
  verbose: (text: string) => chalk.dim(text),

  // formatting helper for cleaning formatting
  clean: (msg: string) => stripVTControlCharacters(msg),
};

function formatDuration(duration: number): string {
  if (duration > 1000) {
    return `${chalk.green((duration / 1000).toFixed(2))}s`;
  } else {
    const decimalPlaces = Math.max(0, 2 - Math.floor(Math.log10(duration)));
    return `${chalk.green(duration.toFixed(decimalPlaces))}ms`;
  }
}

function formatModuleName(moduleName: string) {
  if (moduleName.startsWith("@")) {
    const parts = moduleName.split("/");
    if (parts.length > 1) {
      return chalk.bold(parts[0] + "/" + chalk.cyan(parts.slice(1).join("/")));
    }
  }
  return chalk.bold(chalk.cyan(moduleName));
}

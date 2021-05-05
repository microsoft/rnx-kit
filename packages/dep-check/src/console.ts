import chalk from "chalk";

export function error(message: string): void {
  console.error(chalk.red("error:"), message);
}

export function warn(message: string): void {
  console.warn(chalk.yellow("warn:"), message);
}

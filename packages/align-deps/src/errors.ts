import { error, info } from "@rnx-kit/console";
import chalk from "chalk";
import type { ErrorCode } from "./types";

export function isError<T>(config: T | ErrorCode): config is ErrorCode {
  return typeof config === "string";
}

export function printError(manifestPath: string, code: ErrorCode): void {
  switch (code) {
    case "success":
      break;

    case "invalid-app-requirements":
      error(
        `${manifestPath}: app requirements must resolve to a single profile`
      );
      break;

    case "invalid-configuration":
      error(`${manifestPath}: align-deps was not properly configured`);
      break;

    case "invalid-manifest":
      error(
        `${manifestPath}: Invalid package manifest — please make sure it's not missing 'name' or 'version'`
      );
      break;

    case "missing-react-native":
      error(
        `Failed to infer requirements for '${manifestPath}'. This command ` +
          "currently relies on the 'react-native' version in your project " +
          "to generate the config."
      );
      break;

    case "not-configured":
      error(`${manifestPath}: align-deps was not configured`);
      break;

    case "unsatisfied":
      error(
        `${manifestPath}: Changes are needed to satisfy all requirements. Re-run with '--write' to apply them.`
      );
      break;
  }
}

export function printInfo(): void {
  const url = chalk.bold("https://aka.ms/align-deps");
  info(`Visit ${url} for more information about align-deps.`);
}

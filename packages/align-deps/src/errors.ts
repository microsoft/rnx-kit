import { error, info } from "@rnx-kit/console";
import chalk from "chalk";
import * as path from "path";
import type { ErrorCode } from "./types";

export function printError(manifestPath: string, code: ErrorCode): void {
  const currentPackageJson = path.relative(process.cwd(), manifestPath);

  switch (code) {
    case "success":
      break;

    case "invalid-configuration":
      error(`${currentPackageJson}: align-deps was not properly configured`);
      break;

    case "invalid-manifest":
      error(
        `'${currentPackageJson}' does not contain a valid package manifest — please make sure it's not missing 'name' or 'version'`
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
      error(`${currentPackageJson}: align-deps was not configured`);
      break;

    case "unsatisfied":
      error(
        `${currentPackageJson}: Changes are needed to satisfy all requirements. Re-run with '--write' to apply them.`
      );
      break;
  }
}

export function printInfo(): void {
  const url = chalk.bold("https://aka.ms/align-deps");
  info(`Visit ${url} for more information about align-deps.`);
}

import { error, info } from "@rnx-kit/console";
import chalk from "chalk";
import * as path from "path";
import type { ErrorCode } from "./types";

function printURL(): void {
  const url = chalk.bold("https://aka.ms/align-deps");
  info(`Visit ${url} for more information about align-deps.`);
}

export function printError(manifestPath: string, code: ErrorCode): void {
  const currentPackageJson = path.relative(process.cwd(), manifestPath);

  switch (code) {
    case "success":
      break;

    case "invalid-configuration":
      error(`${currentPackageJson}: align-deps was not properly configured`);
      printURL();
      break;

    case "invalid-manifest":
      error(
        `'${currentPackageJson}' does not contain a valid package manifest — please make sure it's not missing 'name' or 'version'`
      );
      break;

    case "missing-manifest":
      error(
        `'${path.dirname(currentPackageJson)}' is missing a package manifest`
      );
      break;

    case "not-configured":
      error(`${currentPackageJson}: align-deps was not configured`);
      printURL();
      break;

    case "unsatisfied":
      error(
        `${currentPackageJson}: Changes are needed to satisfy all requirements. Re-run with '--write' to apply them.`
      );
      printURL();
      break;
  }
}

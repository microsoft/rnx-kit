import { bold, error, info } from "@rnx-kit/console";
import type { ErrorCode } from "./types.ts";

export function isError<T>(config: T | ErrorCode): config is ErrorCode {
  return typeof config === "string";
}

export function printError(manifestPath: string, code: ErrorCode): void {
  switch (code) {
    case "success":
      break;

    case "excluded":
      info(`${manifestPath} was ignored`);
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

    case "legacy-configuration":
      error(
        `${manifestPath}: align-deps was configured using the old 'dep-check' ` +
          "schema, which is no longer supported. To migrate it, run the last " +
          "version that supported it:\n\n" +
          "\tnpx @rnx-kit/align-deps@^4 --migrate-config --write\n"
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
      // A helpful message should have been printed with the error
      break;
  }
}

export function printInfo(): void {
  const url = bold("https://aka.ms/align-deps");
  info(`Visit ${url} for more information about align-deps.`);
}

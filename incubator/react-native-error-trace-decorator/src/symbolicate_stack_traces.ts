import minimist from "minimist";
import { checkArgumentValidity } from "./check_arguments_validity";
import { extractAndSymbolicateErrorStack } from "./extract_and_process_error_stack";

export const symbolicateStackTraces = () => {
  // Get Arguments
  const commandLineArguments = minimist(process.argv.slice(2));

  // Check whether all args passed are valid
  if (checkArgumentValidity(commandLineArguments)) {
    // Symbolicate error stack and print to console
    extractAndSymbolicateErrorStack(
      commandLineArguments.errorFile,
      commandLineArguments.configFile
    );
  }
};

import { checkArgumentValidity } from "./check_arguments_validity";
import { extractAndSymbolicateErrorStack } from "./extract_and_process_error_stack";

export function symbolicateStackTraces(): void {
  // Check whether all args passed are valid
  const commandLineArguments = checkArgumentValidity(process.argv);
  if (commandLineArguments) {
    // Symbolicate error stack and print to console
    extractAndSymbolicateErrorStack(
      commandLineArguments.errorFile,
      commandLineArguments.configFile
    );
  }
}

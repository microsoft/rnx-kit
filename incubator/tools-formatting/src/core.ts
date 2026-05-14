import { getReporter } from "./reporters.ts";
import type { FileMessage, ReporterOption, Severity } from "./types.ts";

/**
 * Format a message for output using standard formatting rules. The output format will depend on the reporter
 * being used, which can be specified or will be determined automatically based on the environment.
 * @param severity what level the message is (e.g. error, warn, info)
 * @param message the message to format
 * @param reporter the reporter to use for formatting, omit to use the default reporter
 * @returns the formatted message
 */
export function formatMessage(
  severity: Severity,
  message: string,
  reporter?: ReporterOption
): string {
  reporter = getReporter(reporter);
  return reporter.formatMessage(severity, message);
}

/**
 * Format a file message for output using standard formatting rules. When running under github or azure this will attempt
 * to format the output such that file links are resolvable.
 * @param severity what level the message is (e.g. error, warn, info)
 * @param fileMessage the file message to format
 * @param reporter the reporter to use for formatting, omit to use the default reporter
 * @returns the formatted file message
 */
export function formatFileMessage(
  severity: Severity,
  fileMessage: FileMessage,
  reporter?: ReporterOption
): string {
  reporter = getReporter(reporter);
  return reporter.formatFileMessage(severity, fileMessage);
}

/**
 * Format grouped output for display using standard formatting rules. For normal console output this will format the
 * group in a tree-like structure. When running under github or azure this will attempt to use collapsible groups in the UI.
 * @param header the header to display for the group
 * @param children the messages to include in the group
 * @param reporter the reporter to use for formatting, omit to use the default reporter
 * @returns the formatted group of messages
 */
export function formatGroup(
  header: string,
  children: string[],
  reporter?: ReporterOption
): string {
  reporter = getReporter(reporter);
  return reporter.formatGroup(header, children);
}

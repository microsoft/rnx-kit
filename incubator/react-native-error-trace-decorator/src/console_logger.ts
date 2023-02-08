import * as chalk from "chalk";

/**
 * This class is a wrapper around chalk to log outputs to console.
 * It logs colour coded messages with log levels for readibility and consistency
 * There should be no console usages in teams-mobile-sdk and all console logs should use this wrapper instead.
 */

/**
 * COLOUR CODING
 *
 * ERROR: Red
 * WARN: Yellow
 * DEBUG: Bright Blue
 * LOG: Bright Green
 */
export class ConsoleLogger {
  /**
   * Logs an error level log to the console
   * @param errorMessage The error message to be logged
   */
  public static error(errorMessage: string) {
    // eslint-disable-next-line no-console
    console.error(
      `${chalk.bgRed.bold.black("ERROR")}\t${chalk.red(errorMessage)}`
    );
  }

  /**
   * Logs a warning level message to the console
   * @param warnMessage The warning message to be logged
   */
  public static warn(warnMessage: string) {
    // eslint-disable-next-line no-console
    console.warn(
      `${chalk.bgYellow.bold.black("WARN")}\t${chalk.yellow(warnMessage)}`
    );
  }

  /**
   * Logs a debug level message to the console
   * @param debugMessage The debug message to be logged
   */
  public static debug(debugMessage: string) {
    // eslint-disable-next-line no-console
    console.debug(
      `${chalk.bgBlueBright.bold.black("DEBUG")}\t${chalk.blueBright(
        debugMessage
      )}`
    );
  }

  /**
   * The log level message to be logged
   * @param logMessage The log message to be logged
   */
  public static log(logMessage: string) {
    // eslint-disable-next-line no-console
    console.log(
      `${chalk.bgGreenBright.bold.black("LOG")}\t${chalk.greenBright(
        logMessage
      )}`
    );
  }
}

/**
 * Context which should be passed in to a lint rule when it runs. This provides information about the linting environment
 * and utilities for logging messages.
 */
export type Context = {
  /**
   * Lint mode, which is generally check mode or fix mode.
   */
  mode: "check" | "fix";

  /**
   * Print out an informational message.
   */
  report: (
    level: "info" | "warn" | "error",
    target: string,
    message: string
  ) => void;

  /**
   * Report that a change has been made to the target being linted.
   */
  markDirty: () => void;
};

export type ReportOrFix = <T>(message: string, fixer?: () => T) => T;

export type ReportingContextStatics = {
  level: "warn" | "error";
  name: string;
  context: Context;
  value: unknown;
};

export type ReportingContext = ReportOrFix & {
  statics: ReportingContextStatics;
  update: (name: string, level: "warn" | "error", value: unknown) => void;
};

export function createReportingContext(
  context: Context,
  name: string,
  level: "warn" | "error",
  value: unknown
): ReportingContext {
  const statics = { level, name, context, value };
  function update(name: string, level: "warn" | "error", value: unknown) {
    statics.name = name;
    statics.level = level;
    statics.value = value;
  }
  const reportOrFix: ReportOrFix = <T>(message: string, fixer?: () => T) => {
    if (context.mode === "fix" && fixer) {
      context.markDirty();
      return fixer() as T;
    } else {
      const { level, name, value } = statics;
      context.report(level, name, message);
      return value as T;
    }
  };
  return Object.assign(reportOrFix, { statics, update });
}

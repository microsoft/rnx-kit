import { createAzureReporter } from "./azure.ts";
import { REPORTER_ENV_KEY } from "./const.ts";
import { createGitHubReporter } from "./github.ts";
import { formatConsoleFileMessage, formatConsoleMessage } from "./messages.ts";
import { formatAsTree } from "./trees.ts";
import type {
  Reporter,
  BuiltinReporter,
  ReporterOption,
  ReporterPropOverrides,
  Severity,
  FileMessage,
} from "./types.ts";

const reporterCache: Partial<Record<BuiltinReporter, Reporter>> = {};

/**
 * Get a reporter instance based on the provided option. If a built-in reporter name is provided, the corresponding reporter
 * will be returned. If a custom reporter instance is provided, it will be returned as-is. If no option is provided, the default
 * reporter will be returned.
 * @param reporter The reporter option, which can be a built-in reporter name, a custom reporter instance, or undefined to use the default reporter.
 * @returns A resolved reporter instance.
 */
export function getReporter(reporter?: ReporterOption): Reporter {
  if (reporter) {
    if (typeof reporter === "string") {
      return (reporterCache[reporter as BuiltinReporter] ??= createReporter(
        reporter as BuiltinReporter
      ));
    } else if (typeof reporter === "object" && "formatMessage" in reporter) {
      return reporter;
    } else {
      throw new Error(`Invalid reporter option: ${reporter}`);
    }
  }
  return getDefaultReporter();
}

/**
 * Construct a fresh built-in reporter of the given type. Used by
 * {@link getReporter} when a built-in name is requested; the cache layer there
 * means most callers never invoke this directly. Available as an export so
 * callers can build customized variants (e.g. an ASCII-only file reporter)
 * without going through the cache.
 * @param type The built-in reporter type to create.
 * @param options Optional overrides for the reporter's name / color / ASCII flags.
 * @returns A new reporter instance.
 * @throws if `type` is not a known built-in.
 */
export function createReporter(
  type: BuiltinReporter,
  options?: ReporterPropOverrides
): Reporter {
  switch (type) {
    case "github":
      return createGitHubReporter(options);
    case "azure":
      return createAzureReporter(options);
    case "console":
    case "file":
      return createConsoleOrFileReporter(type, options);
    default:
      throw new Error(`Unknown reporter type: ${type}`);
  }
}

/**
 * Build the shared implementation used by the `"console"` and `"file"` built-in
 * reporters. Both delegate to the same formatters from `messages.ts` and
 * `trees.ts`; they only differ in their default `noColors` value (`file`
 * defaults to no colors so log files don't accumulate ANSI escape codes).
 * @param type Either `"console"` or `"file"`.
 * @param options Optional overrides for name / color / ASCII behavior.
 * @returns A reporter that formats output for plain-text streams.
 */
export function createConsoleOrFileReporter(
  type: Extract<BuiltinReporter, "console" | "file">,
  options?: ReporterPropOverrides
): Reporter {
  const name = options?.name ?? type;
  const noColors = options?.noColors ?? type === "file";
  const asciiOnly = options?.asciiOnly ?? false;
  const base = { name, noColors, asciiOnly };

  function formatMessage(severity: Severity, message: string): string {
    return formatConsoleMessage(severity, message, base);
  }

  function formatFileMessage(
    severity: Severity,
    fileMessage: FileMessage
  ): string {
    return formatConsoleFileMessage(severity, fileMessage, base);
  }

  function formatGroup(header: string, children: string[]): string {
    return formatAsTree(header, children, base);
  }

  return Object.assign(base, { formatMessage, formatFileMessage, formatGroup });
}

/**
 * gets the default reporter to use based on environment variables and CI detection
 * and caches the result for future calls.
 * @returns The default reporter instance.
 */
export const getDefaultReporter = (() => {
  let cachedReporter: Reporter | null = null;
  return (): Reporter =>
    (cachedReporter ??= getReporter(getDefaultReporterType()));
})();

/**
 * Resolves the default reporter to use based on environment variables and CI detection.
 * @returns The default reporter type.
 * @internal exposed for testing
 */
export function getDefaultReporterType(): BuiltinReporter {
  const envReporter = process.env[REPORTER_ENV_KEY] as
    | BuiltinReporter
    | undefined;
  if (envReporter) {
    return envReporter;
  }
  if (isGitHubActions()) {
    return "github";
  }
  if (isAzurePipelines()) {
    return "azure";
  }
  return "console";
}

/**
 * Returns `true` when the current process is running inside a GitHub Actions
 * job. Detected via the standard `GITHUB_ACTIONS` environment variable that
 * the GitHub Actions runner sets to `"true"`.
 */
export function isGitHubActions(): boolean {
  return process.env.GITHUB_ACTIONS === "true";
}

/**
 * Returns `true` when the current process is running inside an Azure Pipelines
 * job. Detected via the standard `TF_BUILD` environment variable that the
 * Azure Pipelines agent sets to `"True"`.
 */
export function isAzurePipelines(): boolean {
  return process.env.TF_BUILD === "True";
}

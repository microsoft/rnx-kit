import { AzureReporter } from "./azure.ts";
import { REPORTER_ENV_KEY } from "./const.ts";
import { GitHubReporter } from "./github.ts";
import { formatConsoleFileMessage, formatConsoleMessage } from "./messages.ts";
import { formatConsoleGroup } from "./trees.ts";
import type { Reporter, BuiltinReporters, ColorOptions } from "./types.ts";

const disableColors: ColorOptions = {
  noColors: true,
};

const BUILTIN_REPORTERS: Record<BuiltinReporters, Reporter> = {
  github: GitHubReporter,
  azure: AzureReporter,
  console: {
    name: "console",
    noColors: false,
    asciiOnly: false,
    formatMessage: formatConsoleMessage,
    formatFileMessage: formatConsoleFileMessage,
    formatGroup: formatConsoleGroup,
  },
  file: {
    name: "file",
    ...disableColors,
    asciiOnly: false,
    formatMessage: (severity, message) =>
      formatConsoleMessage(severity, message, disableColors),
    formatFileMessage: (severity, fileMessage) =>
      formatConsoleFileMessage(severity, fileMessage, disableColors),
    formatGroup: formatConsoleGroup,
  },
};

/**
 * Get a reporter instance based on the provided option. If a built-in reporter name is provided, the corresponding reporter
 * will be returned. If a custom reporter instance is provided, it will be returned as-is. If no option is provided, the default
 * reporter will be returned.
 * @param reporter The reporter option, which can be a built-in reporter name, a custom reporter instance, or undefined to use the default reporter.
 * @returns A resolved reporter instance.
 */
export function getReporter(
  reporter?: BuiltinReporters | string | Reporter
): Reporter {
  if (reporter) {
    if (typeof reporter === "string") {
      const builtin = BUILTIN_REPORTERS[reporter as BuiltinReporters];
      if (builtin) {
        return builtin;
      }
    } else {
      return reporter;
    }
  }
  return getDefaultReporter();
}

/**
 * gets the default reporter to use based on environment variables and CI detection
 * and caches the result for future calls.
 * @returns The default reporter instance.
 */
export const getDefaultReporter = (() => {
  let cachedReporter: Reporter | null = null;
  return (): Reporter => (cachedReporter ??= resolveDefaultReporter());
})();

/**
 * Resolves the default reporter to use based on environment variables and CI detection.
 * @returns The resolved reporter instance.
 * @internal exposed for testing
 */
export function resolveDefaultReporter(): Reporter {
  const envReporter = process.env[REPORTER_ENV_KEY] as
    | BuiltinReporters
    | undefined;
  if (envReporter) {
    const reporter = BUILTIN_REPORTERS[envReporter];
    if (reporter) {
      return reporter;
    }
  }
  if (isGitHubActions()) {
    return BUILTIN_REPORTERS.github;
  }
  if (isAzurePipelines()) {
    return BUILTIN_REPORTERS.azure;
  }
  return BUILTIN_REPORTERS.console;
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

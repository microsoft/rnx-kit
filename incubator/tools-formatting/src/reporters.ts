import { createAzureReporter } from "./azure.ts";
import { REPORTER_ENV_KEY } from "./const.ts";
import { createGitHubReporter } from "./github.ts";
import { formatConsoleFileMessage, formatConsoleMessage } from "./messages.ts";
import { formatAsTree } from "./trees.ts";
import type {
  BuiltinReporter,
  FileMessage,
  Reporter,
  ReporterOption,
  ReporterPropOverrides,
  Severity,
} from "./types.ts";

/**
 * Registry of built-in reporters and the default-reporter resolution logic.
 *
 * The package exposes a process-wide singleton (see {@link getReporterRegistry}
 * and {@link setReporterRegistry}) which is what the top-level helpers like
 * {@link getReporter} and {@link getDefaultReporter} delegate to.
 *
 * `ReporterRegistry` is intended to be subclassed when a consuming tool needs
 * to:
 * - register additional built-in reporter types — override {@link createReporter}
 *   and dispatch new names before falling through to `super.createReporter`,
 * - add new CI provider detection — override {@link getDefaultReporterType}
 *   and fall through to `super.getDefaultReporterType` for the standard chain,
 * - use a different environment-variable key for the explicit override —
 *   override the {@link envKey} property.
 *
 * Install your subclass with {@link setReporterRegistry} (typically at the
 * entry point of your tool, before any reporting happens).
 */
export class ReporterRegistry {
  /**
   * Environment variable consulted by {@link getDefaultReporterType} to allow
   * an explicit override of the auto-detected reporter. Subclasses may set
   * this to a tool-specific key (e.g. `"MYTOOL_REPORTER"`).
   */
  protected envKey: string = REPORTER_ENV_KEY;

  /**
   * Cache of reporter instances keyed by their built-in name. Populated by
   * {@link getReporter} when a name is resolved for the first time. Cleared
   * by {@link reset}.
   */
  protected readonly reporterCache = new Map<string, Reporter>();

  /**
   * Cached default reporter, populated by the first call to
   * {@link getDefaultReporter}. Cleared by {@link reset}.
   */
  protected cachedDefault: Reporter | null = null;

  /**
   * Resolve a {@link ReporterOption} into a concrete {@link Reporter}:
   * - a string is treated as a built-in name and looked up via
   *   {@link createReporter}; the resulting instance is cached so repeat lookups
   *   return the same object,
   * - a `Reporter` object is returned as-is (never cached, since callers may
   *   pass anonymous instances),
   * - `undefined` falls through to {@link getDefaultReporter}.
   *
   * Throws when a string name isn't recognized by {@link createReporter} or
   * when the value isn't a string, reporter, or `undefined`.
   */
  getReporter(reporter?: ReporterOption): Reporter {
    if (reporter) {
      if (typeof reporter === "string") {
        let cached = this.reporterCache.get(reporter);
        if (!cached) {
          cached = this.createReporter(reporter);
          this.reporterCache.set(reporter, cached);
        }
        return cached;
      }
      if (typeof reporter === "object" && "formatMessage" in reporter) {
        return reporter;
      }
      throw new Error(`Invalid reporter option: ${String(reporter)}`);
    }
    return this.getDefaultReporter();
  }

  /**
   * Get the default reporter for the current environment. The default is
   * computed by passing the result of {@link getDefaultReporterType} through
   * {@link getReporter}; the resulting instance is cached, so subsequent calls
   * return the same object until {@link reset} is called.
   */
  getDefaultReporter(): Reporter {
    return (this.cachedDefault ??= this.getReporter(
      this.getDefaultReporterType()
    ));
  }

  /**
   * Construct a {@link Reporter} for the given built-in name. Subclasses
   * should override this to add new reporter types; dispatch the new names
   * first and call `super.createReporter(type, options)` for anything the
   * subclass doesn't handle so the standard built-ins still resolve.
   *
   * @param type Reporter name. Built-in values are `"github"`, `"azure"`,
   *             `"console"`, and `"file"`.
   * @param options Optional overrides applied to the resulting reporter
   *             (name, color, ASCII-only).
   * @throws when `type` is not a recognized name.
   */
  createReporter(type: string, options?: ReporterPropOverrides): Reporter {
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
   * Determine which built-in reporter name to use when no explicit reporter
   * is provided. The default implementation, in order:
   * 1. returns the value of `process.env[this.envKey]` if set,
   * 2. returns `"github"` when {@link isGitHubActions} is true,
   * 3. returns `"azure"` when {@link isAzurePipelines} is true,
   * 4. returns `"console"`.
   *
   * Subclasses can add additional CI providers by overriding this method and
   * falling through to `super.getDefaultReporterType()` for the standard chain.
   */
  getDefaultReporterType(): string {
    const envReporter = process.env[this.envKey];
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
   * Drop every cached reporter, including the cached default. The next call
   * to {@link getReporter} or {@link getDefaultReporter} will rebuild from
   * scratch. Useful in tests that mutate `process.env`, or when a tool
   * dynamically registers a new reporter after the default has already been
   * resolved.
   */
  reset(): void {
    this.reporterCache.clear();
    this.cachedDefault = null;
  }
}

let singletonRegistry: ReporterRegistry | undefined;

/**
 * Get the process-wide singleton {@link ReporterRegistry}, constructing a
 * default instance on first access. All top-level helpers (`getReporter`,
 * `getDefaultReporter`, `formatMessage`, `formatFileMessage`, `formatGroup`)
 * delegate to whichever instance this returns.
 */
export function getReporterRegistry(): ReporterRegistry {
  return (singletonRegistry ??= new ReporterRegistry());
}

/**
 * Replace the process-wide singleton {@link ReporterRegistry} — typically
 * called once at the entry point of a tool that wants to register additional
 * reporters or extend the default-resolution logic via a `ReporterRegistry`
 * subclass.
 *
 * Pass `undefined` to drop the current instance; the next call to
 * {@link getReporterRegistry} will create a fresh default.
 *
 * @param registry Registry to install as the singleton, or `undefined` to
 *                 discard the current one.
 */
export function setReporterRegistry(
  registry: ReporterRegistry | undefined
): void {
  singletonRegistry = registry;
}

/**
 * Resolve a reporter via the singleton registry. See
 * {@link ReporterRegistry.getReporter}.
 */
export function getReporter(reporter?: ReporterOption): Reporter {
  return getReporterRegistry().getReporter(reporter);
}

/**
 * Get the cached default reporter via the singleton registry. See
 * {@link ReporterRegistry.getDefaultReporter}.
 */
export function getDefaultReporter(): Reporter {
  return getReporterRegistry().getDefaultReporter();
}

/**
 * Determine the default reporter name for the current environment via the
 * singleton registry. See {@link ReporterRegistry.getDefaultReporterType}.
 */
export function getDefaultReporterType(): string {
  return getReporterRegistry().getDefaultReporterType();
}

/**
 * Construct a fresh reporter for the given built-in name via the singleton
 * registry. See {@link ReporterRegistry.createReporter}. Unlike
 * {@link getReporter}, this never consults the registry's cache, so each
 * call produces a new instance.
 */
export function createReporter(
  type: string,
  options?: ReporterPropOverrides
): Reporter {
  return getReporterRegistry().createReporter(type, options);
}

/**
 * Build the shared implementation used by the `"console"` and `"file"`
 * built-in reporters. Both delegate to the same formatters from
 * `messages.ts` and `trees.ts`; they only differ in their default
 * `noColors` value (`file` defaults to no colors so log files don't
 * accumulate ANSI escape codes).
 *
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
 * Returns `true` when the current process is running inside a GitHub Actions
 * job. Detected via the standard `GITHUB_ACTIONS` environment variable that
 * the GitHub Actions runner sets to `"true"`.
 */
export function isGitHubActions(): boolean {
  return process.env.GITHUB_ACTIONS === "true";
}

/**
 * Returns `true` when the current process is running inside an Azure
 * Pipelines job. Detected via the standard `TF_BUILD` environment variable
 * that the Azure Pipelines agent sets to `"True"`.
 */
export function isAzurePipelines(): boolean {
  return process.env.TF_BUILD === "True";
}

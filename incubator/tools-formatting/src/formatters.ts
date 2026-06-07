import { createAzureFormatter } from "./azure.ts";
import { FORMATTER_ENV_KEY } from "./const.ts";
import { createGitHubFormatter } from "./github.ts";
import { formatConsoleFileMessage, formatConsoleMessage } from "./messages.ts";
import { formatAsTree } from "./trees.ts";
import type {
  BuiltinFormatter,
  Formatter,
  FormatterOption,
  FormatterPropOverrides,
} from "./types.ts";

/**
 * Registry of built-in formatters and the default-formatter resolution logic.
 *
 * The package exposes a process-wide singleton (see {@link getFormatterRegistry}
 * and {@link setFormatterRegistry}) which is what the top-level helpers like
 * {@link getFormatter} and {@link getDefaultFormatter} delegate to.
 *
 * `FormatterRegistry` is intended to be subclassed when a consuming tool needs
 * to:
 * - register additional built-in formatter types — override {@link createFormatter}
 *   and dispatch new names before falling through to `super.createFormatter`,
 * - add new CI provider detection — override {@link getDefaultFormatterType}
 *   and fall through to `super.getDefaultFormatterType` for the standard chain,
 * - use a different environment-variable key for the explicit override —
 *   override the {@link envKey} property.
 *
 * Install your subclass with {@link setFormatterRegistry} (typically at the
 * entry point of your tool, before any formatting happens).
 */
export class FormatterRegistry {
  /**
   * Environment variable consulted by {@link getDefaultFormatterType} to allow
   * an explicit override of the auto-detected formatter. Subclasses may set
   * this to a tool-specific key (e.g. `"MYTOOL_FORMATTER"`).
   */
  protected envKey: string = FORMATTER_ENV_KEY;

  /**
   * Cache of formatter instances keyed by their built-in name. Populated by
   * {@link getFormatter} when a name is resolved for the first time. Cleared
   * by {@link reset}.
   */
  protected readonly formatterCache = new Map<string, Formatter>();

  /**
   * Cached default formatter, populated by the first call to
   * {@link getDefaultFormatter}. Cleared by {@link reset}.
   */
  protected cachedDefault: Formatter | null = null;

  /**
   * Resolve a {@link FormatterOption} into a concrete {@link Formatter}:
   * - a string is treated as a built-in name and looked up via
   *   {@link createFormatter}; the resulting instance is cached so repeat lookups
   *   return the same object,
   * - a `Formatter` object is returned as-is (never cached, since callers may
   *   pass anonymous instances),
   * - `undefined` falls through to {@link getDefaultFormatter}.
   *
   * Throws when a string name isn't recognized by {@link createFormatter} or
   * when the value isn't a string, formatter, or `undefined`.
   */
  getFormatter(formatter?: FormatterOption): Formatter {
    if (formatter) {
      if (typeof formatter === "string") {
        let cached = this.formatterCache.get(formatter);
        if (!cached) {
          cached = this.createFormatter(formatter);
          this.formatterCache.set(formatter, cached);
        }
        return cached;
      }
      if (typeof formatter === "object" && "formatMessage" in formatter) {
        return formatter;
      }
      throw new Error(`Invalid formatter option: ${String(formatter)}`);
    }
    return this.getDefaultFormatter();
  }

  /**
   * Get the default formatter for the current environment. The default is
   * computed by passing the result of {@link getDefaultFormatterType} through
   * {@link getFormatter}; the resulting instance is cached, so subsequent calls
   * return the same object until {@link reset} is called.
   */
  getDefaultFormatter(): Formatter {
    return (this.cachedDefault ??= this.getFormatter(
      this.getDefaultFormatterType()
    ));
  }

  /**
   * Construct a {@link Formatter} for the given built-in name. Subclasses
   * should override this to add new formatter types; dispatch the new names
   * first and call `super.createFormatter(type, options)` for anything the
   * subclass doesn't handle so the standard built-ins still resolve.
   *
   * @param type Formatter name. Built-in values are `"github"`, `"azure"`,
   *             `"console"`, and `"file"`.
   * @param options Optional overrides applied to the resulting formatter
   *             (name, color, ASCII-only).
   * @throws when `type` is not a recognized name.
   */
  createFormatter(type: string, options?: FormatterPropOverrides): Formatter {
    switch (type) {
      case "github":
        return createGitHubFormatter(options);
      case "azure":
        return createAzureFormatter(options);
      case "console":
      case "file":
        return createConsoleOrFileFormatter(type, options);
      default:
        throw new Error(`Unknown formatter type: ${type}`);
    }
  }

  /**
   * Determine which built-in formatter name to use when no explicit formatter
   * is provided. The default implementation, in order:
   * 1. returns the value of `process.env[this.envKey]` if set,
   * 2. returns `"github"` when {@link isGitHubActions} is true,
   * 3. returns `"azure"` when {@link isAzurePipelines} is true,
   * 4. returns `"console"`.
   *
   * Subclasses can add additional CI providers by overriding this method and
   * falling through to `super.getDefaultFormatterType()` for the standard chain.
   */
  getDefaultFormatterType(): string {
    const envFormatter = process.env[this.envKey];
    if (envFormatter) {
      return envFormatter;
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
   * Drop every cached formatter, including the cached default. The next call
   * to {@link getFormatter} or {@link getDefaultFormatter} will rebuild from
   * scratch. Useful in tests that mutate `process.env`, or when a tool
   * dynamically registers a new formatter after the default has already been
   * resolved.
   */
  reset(): void {
    this.formatterCache.clear();
    this.cachedDefault = null;
  }
}

let singletonRegistry: FormatterRegistry | undefined;

/**
 * Get the process-wide singleton {@link FormatterRegistry}, constructing a
 * default instance on first access. All top-level helpers (`getFormatter`,
 * `getDefaultFormatter`, `formatMessage`, `formatFileMessage`, `formatGroup`)
 * delegate to whichever instance this returns.
 */
export function getFormatterRegistry(): FormatterRegistry {
  return (singletonRegistry ??= new FormatterRegistry());
}

/**
 * Replace the process-wide singleton {@link FormatterRegistry} — typically
 * called once at the entry point of a tool that wants to register additional
 * formatters or extend the default-resolution logic via a `FormatterRegistry`
 * subclass.
 *
 * Pass `undefined` to drop the current instance; the next call to
 * {@link getFormatterRegistry} will create a fresh default.
 *
 * @param registry Registry to install as the singleton, or `undefined` to
 *                 discard the current one.
 */
export function setFormatterRegistry(
  registry: FormatterRegistry | undefined
): void {
  singletonRegistry = registry;
}

/**
 * Resolve a formatter via the singleton registry. See
 * {@link FormatterRegistry.getFormatter}.
 */
export function getFormatter(formatter?: FormatterOption): Formatter {
  return getFormatterRegistry().getFormatter(formatter);
}

/**
 * Get the cached default formatter via the singleton registry. See
 * {@link FormatterRegistry.getDefaultFormatter}.
 */
export function getDefaultFormatter(): Formatter {
  return getFormatterRegistry().getDefaultFormatter();
}

/**
 * Determine the default formatter name for the current environment via the
 * singleton registry. See {@link FormatterRegistry.getDefaultFormatterType}.
 */
export function getDefaultFormatterType(): string {
  return getFormatterRegistry().getDefaultFormatterType();
}

/**
 * Construct a fresh formatter for the given built-in name via the singleton
 * registry. See {@link FormatterRegistry.createFormatter}. Unlike
 * {@link getFormatter}, this never consults the registry's cache, so each
 * call produces a new instance.
 */
export function createFormatter(
  type: string,
  options?: FormatterPropOverrides
): Formatter {
  return getFormatterRegistry().createFormatter(type, options);
}

/**
 * Build the shared implementation used by the `"console"` and `"file"`
 * built-in formatters. Both delegate to the same formatters from
 * `messages.ts` and `trees.ts`; they only differ in their default
 * `noColors` value (`file` defaults to no colors so log files don't
 * accumulate ANSI escape codes).
 *
 * @param type Either `"console"` or `"file"`.
 * @param options Optional overrides for name / color / ASCII behavior.
 * @returns A formatter that formats output for plain-text streams.
 */
export function createConsoleOrFileFormatter(
  type: Extract<BuiltinFormatter, "console" | "file">,
  options?: FormatterPropOverrides
): Formatter {
  const name = options?.name ?? type;
  const noColors = options?.noColors ?? type === "file";
  const asciiOnly = Boolean(options?.asciiOnly);
  const formatter: Formatter = {
    name,
    noColors,
    asciiOnly,
    formatMessage: (severity, message) =>
      formatConsoleMessage(severity, message, formatter),
    formatFileMessage: (severity, fileMessage) =>
      formatConsoleFileMessage(severity, fileMessage, formatter),
    formatGroup: (header, children) =>
      formatAsTree(header, children, formatter),
  };
  return formatter;
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

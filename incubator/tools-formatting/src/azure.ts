import { formatConsoleFileMessage, formatConsoleMessage } from "./messages.ts";
import { normalizePath } from "./paths.ts";
import type {
  ColorOptions,
  FileMessage,
  Formatter,
  Severity,
} from "./types.ts";

const SEVERITY_TO_TEXT: Partial<Record<Severity, string>> = {
  error: "error",
  warn: "warning",
};

/**
 * Pre-built {@link Formatter} that emits Azure Pipelines logging commands
 * (`##vso[task.logissue ...]` for errors / warnings, `##[group]` /
 * `##[endgroup]` for collapsible sections). Colors are disabled by default.
 * Use {@link createAzureFormatter} to construct a variant with different
 * defaults.
 */
export const AzureFormatter = createAzureFormatter();

/**
 * Creates a new AzureFormatter with the given options.
 * @param options Options to customize the formatter's behavior.
 * @returns A new AzureFormatter instance.
 */
export function createAzureFormatter(options?: ColorOptions): Formatter {
  const noColors = options?.noColors ?? true;
  const formatter: Formatter = {
    name: "azure",
    noColors,
    asciiOnly: false,
    formatMessage: (severity, message) =>
      formatAzureMessage(severity, message, formatter),
    formatFileMessage: (severity, fileMessage) =>
      formatAzureFileMessage(severity, fileMessage, formatter),
    formatGroup: (header, children) => {
      const groupStart = `##[group]${escapeAzureData(header)}`;
      const groupEnd = "##[endgroup]";
      return [groupStart, ...children, groupEnd].join("\n");
    },
  };
  return formatter;
}

/**
 * Format a plain (non-file) message for Azure Pipelines. For `error` and
 * `warn`, emits a `##vso[task.logissue type=...]` logging command so the
 * message is surfaced in the build summary. For `info` (which has no native
 * Azure equivalent), falls back to the console formatter so the message at
 * least appears in the log stream.
 */
function formatAzureMessage(
  severity: Severity,
  message: string,
  options?: ColorOptions
): string {
  const sevText = SEVERITY_TO_TEXT[severity];
  if (!sevText) {
    return formatConsoleMessage(severity, message, options);
  }
  return `##vso[task.logissue type=${sevText}]${escapeAzureData(message)}`;
}

/**
 * Format a file-located message for Azure Pipelines. Errors and warnings are
 * emitted as `##vso[task.logissue ...]` commands with `sourcepath`,
 * `linenumber`, and `columnnumber` properties so the Pipelines UI can render
 * the diagnostic against the source file. The `endLine`, `endCol`, and `title`
 * fields are ignored — Azure has no equivalent properties. `info` severity
 * falls back to the console formatter (no native Azure level).
 */
function formatAzureFileMessage(
  severity: Severity,
  fileMessage: FileMessage,
  options?: ColorOptions
): string {
  const sevText = SEVERITY_TO_TEXT[severity];
  if (!sevText) {
    return formatConsoleFileMessage(severity, fileMessage, options);
  }
  const { message, file, root, line, col } = fileMessage;
  const filePath = normalizePath(file, root);
  let msg = `##vso[task.logissue type=${sevText};sourcepath=${escapeAzureProp(filePath)}`;
  if (line !== undefined) {
    msg += `;linenumber=${line}`;
  }
  if (col !== undefined) {
    msg += `;columnnumber=${col}`;
  }
  msg += `]${escapeAzureData(message)}`;
  return msg;
}

/**
 * Escape Azure DevOps logging-command "data" (the portion after the `]`).
 * Uses `%AZP25` for `%` so the agent can distinguish encoded text from
 * user-supplied `%` characters, and percent-encodes CR / LF so multi-line
 * messages don't break the single-line command format.
 */
function escapeAzureData(s: string): string {
  return s
    .replaceAll("%", "%AZP25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

/**
 * Escape Azure DevOps logging-command "property" values (the parts between
 * `[task.logissue ...]`). In addition to the data escapes, also escapes the
 * property separator `;` and the command terminator `]`.
 */
function escapeAzureProp(s: string): string {
  return escapeAzureData(s).replaceAll(";", "%3B").replaceAll("]", "%5D");
}

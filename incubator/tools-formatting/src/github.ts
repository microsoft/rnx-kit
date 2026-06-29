import { normalizePath } from "./paths.ts";
import type {
  FileMessage,
  Formatter,
  FormatterPropOverrides,
  Severity,
} from "./types.ts";

/**
 * Create a GitHub formatter instance.
 * @param options Formatter property overrides. These are ignored by the methods for now.
 * @returns A GitHub formatter instance.
 */
export function createGitHubFormatter(
  options?: FormatterPropOverrides
): Formatter {
  const {
    name = "github",
    noColors = false,
    asciiOnly = false,
  } = options || {};
  return {
    name,
    noColors,
    asciiOnly,
    formatMessage: formatGitHubMessage,
    formatFileMessage: formatGitHubFileMessage,
    formatGroup: formatGitHubGroup,
  };
}

const MSG_TO_PREFIX: Record<Severity, string> = {
  error: "::error",
  warn: "::warning",
  info: "::notice",
};

const FILE_PROP_KEYS: [keyof FileMessage, string][] = [
  ["line", "line"],
  ["col", "col"],
  ["endLine", "endLine"],
  ["endCol", "endColumn"],
  ["title", "title"],
];

/**
 * Format a plain (non-file) message as a GitHub Actions workflow command:
 * `::error::message` / `::warning::message` / `::notice::message`. The message
 * text is percent-encoded so CR / LF / `%` don't break the command.
 */
function formatGitHubMessage(severity: Severity, message: string): string {
  const prefix = MSG_TO_PREFIX[severity];
  return `${prefix}::${escapeGitHubData(message)}`;
}

/**
 * Format a file-located message as a GitHub Actions annotation. Emits a
 * workflow command with properties for `file`, `line`, `col`, `endLine`,
 * `endColumn`, and `title` so the annotation renders inline on the PR / build
 * page with a clickable file link. Property values are percent-encoded for
 * the property delimiter set (`%` / CR / LF / `:` / `,`); message data uses
 * the lighter data escape (no `:` / `,`).
 */
function formatGitHubFileMessage(
  severity: Severity,
  fileMessage: FileMessage
): string {
  const prefix = MSG_TO_PREFIX[severity];
  const { message, file, root } = fileMessage;
  const filePath = normalizePath(file, root);
  let propStr = `file=${escapeGitHubProp(filePath)}`;
  for (const [key, propName] of FILE_PROP_KEYS) {
    const value = fileMessage[key];
    if (value !== undefined) {
      propStr += `,${propName}=${typeof value === "string" ? escapeGitHubProp(value) : String(value)}`;
    }
  }
  return `${prefix} ${propStr}::${escapeGitHubData(message)}`;
}

/**
 * Wrap a list of child lines in a GitHub Actions collapsible group. The
 * header is percent-encoded so embedded CR / LF / `%` don't break the
 * `::group::` workflow command. Returns a single string with the group
 * start / children / `::endgroup::` joined by newlines.
 */
function formatGitHubGroup(header: string, children: string[]): string {
  const escapedHeader = escapeGitHubData(header);
  const groupStart = `::group::${escapedHeader}`;
  const groupEnd = "::endgroup::";
  return [groupStart, ...children, groupEnd].join("\n");
}

/**
 * Escape data for the message portion of a GitHub Actions workflow command.
 * Per the workflow-command spec, message data only needs `%`, CR, and LF
 * encoded; `:` and `,` are safe to leave alone.
 */
function escapeGitHubData(s: string): string {
  return s
    .replaceAll("%", "%25")
    .replaceAll("\r", "%0D")
    .replaceAll("\n", "%0A");
}

/**
 * Escape values used in workflow-command property positions (e.g. `file=...`).
 * Adds `:` and `,` to the data escape set since those characters are the
 * property delimiters.
 */
function escapeGitHubProp(s: string): string {
  return escapeGitHubData(s).replaceAll(":", "%3A").replaceAll(",", "%2C");
}

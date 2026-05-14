import { normalizePath } from "./paths.ts";
import type { Reporter, Severity, FileMessage } from "./types.ts";

export const GitHubReporter: Reporter = {
  name: "github",
  noColors: false,
  asciiOnly: false,
  formatMessage: formatGitHubMessage,
  formatFileMessage: formatGitHubFileMessage,
  formatGroup: formatGitHubGroup,
};

const MSG_TO_PREFIX: Record<Severity, string> = {
  error: "::error",
  warn: "::warning",
  info: "::notice",
};

const FILE_PROP_KEYS: (keyof FileMessage)[] = [
  "line",
  "col",
  "endLine",
  "endCol",
  "title",
];

function formatGitHubMessage(severity: Severity, message: string): string {
  const prefix = MSG_TO_PREFIX[severity];
  return `${prefix}::${escapeGitHubData(message)}`;
}

function formatGitHubFileMessage(
  severity: Severity,
  fileMessage: FileMessage
): string {
  const prefix = MSG_TO_PREFIX[severity];
  const { message, file, root } = fileMessage;
  const filePath = root ? normalizePath(file, root) : file;
  let propStr = `file=${escapeGitHubProp(filePath)}`;
  for (const key of FILE_PROP_KEYS) {
    const value = fileMessage[key];
    if (value !== undefined) {
      propStr += `,${key}=${typeof value === "string" ? escapeGitHubProp(value) : String(value)}`;
    }
  }
  return `${prefix} ${propStr}::${escapeGitHubData(message)}`;
}

function formatGitHubGroup(header: string, children: string[]): string[] {
  const escapedHeader = escapeGitHubData(header);
  const groupStart = `::group::${escapedHeader}`;
  const groupEnd = "::endgroup::";
  return [groupStart, ...children, groupEnd];
}

// GitHub Actions encodes special characters using percent-encoding. Message
// data only needs CR/LF/% escaped; property values additionally need ":" and
// "," escaped because those are the property delimiters.
function escapeGitHubData(s: string): string {
  return s.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escapeGitHubProp(s: string): string {
  return escapeGitHubData(s).replace(/:/g, "%3A").replace(/,/g, "%2C");
}

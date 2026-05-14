import { formatConsoleFileMessage, formatConsoleMessage } from "./messages.ts";
import { normalizePath } from "./paths.ts";
import type { FileMessage, Reporter, Severity } from "./types.ts";

const SEVERITY_TO_TEXT: Partial<Record<Severity, string>> = {
  error: "error",
  warn: "warning",
};

export const AzureReporter: Reporter = {
  name: "azure",
  noColors: false,
  asciiOnly: false,
  formatMessage: formatAzureMessage,
  formatFileMessage: formatAzureFileMessage,
  formatGroup(header: string, children: string[]): string[] {
    const groupStart = `##[group]${header}`;
    const groupEnd = "##[endgroup]";
    return [groupStart, ...children, groupEnd];
  },
};

function formatAzureMessage(severity: Severity, message: string): string {
  const sevText = SEVERITY_TO_TEXT[severity];
  if (!sevText) {
    return formatConsoleMessage(severity, message);
  }
  return `##vso[task.logissue type=${sevText}]${escapeAzureData(message)}`;
}

function formatAzureFileMessage(
  severity: Severity,
  fileMessage: FileMessage
): string {
  const sevText = SEVERITY_TO_TEXT[severity];
  if (!sevText) {
    return formatConsoleFileMessage(severity, fileMessage);
  }
  const { message, file, root, line, col } = fileMessage;
  const filePath = root ? normalizePath(file, root) : file;
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

// Azure DevOps logging commands use "%AZP25" as the percent escape (so the
// agent can distinguish encoded text from user-supplied "%" characters).
// Property values are delimited by ";" and the command is terminated by "]".
function escapeAzureData(s: string): string {
  return s.replace(/%/g, "%AZP25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

function escapeAzureProp(s: string): string {
  return escapeAzureData(s).replace(/;/g, "%3B").replace(/\]/g, "%5D");
}

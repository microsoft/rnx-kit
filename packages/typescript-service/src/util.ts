import ts from "typescript";

export function getCanonicalFileName(fileName: string): string {
  return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
}

export function getNewLine(): string {
  return ts.sys.newLine;
}

export function isNonEmptyArray(a: unknown): a is Array<unknown> {
  return Array.isArray(a) && a.length > 0;
}

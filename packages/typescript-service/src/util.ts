import ts from "typescript";

export function getCanonicalFileName(fileName: string): string {
  return ts.sys.useCaseSensitiveFileNames ? fileName : fileName.toLowerCase();
}

export function getNewLine(): string {
  return ts.sys.newLine;
}

export function isNonEmptyArray(a: unknown): a is Array<any> {
  return Array.isArray(a) && a.length > 0;
}

export function normalizePath(p: string): string {
  const fixedPathSeparators = p.replace(/\\/g, "/");
  return getCanonicalFileName(fixedPathSeparators);
}

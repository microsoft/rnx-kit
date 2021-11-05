import fs from "fs";
import ts from "typescript";

export function changeModuleResolutionHostToUseReadCache(
  host: ts.ModuleResolutionHost
): void {
  const { fileExists: originalFileExists, readFile: originalReadFile } = host;
  const originalDirectoryExists =
    host.directoryExists ?? ts.sys.directoryExists;
  const originalRealpath = host.realpath ?? fs.realpathSync;
  const originalGetDirectories = host.getDirectories ?? ts.sys.getDirectories;

  const cacheFileExists = new Map<string, boolean>();
  host.fileExists = (fileName: string): boolean => {
    if (!cacheFileExists.has(fileName)) {
      cacheFileExists.set(fileName, originalFileExists(fileName));
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return cacheFileExists.get(fileName)!;
  };

  const cacheReadFile = new Map<string, string | undefined>();
  host.readFile = (fileName: string): string | undefined => {
    if (!cacheReadFile.has(fileName)) {
      cacheReadFile.set(fileName, originalReadFile(fileName));
    }
    return cacheReadFile.get(fileName);
  };

  const cacheDirectoryExists = new Map<string, boolean>();
  host.directoryExists = (directoryName: string): boolean => {
    if (!cacheDirectoryExists.has(directoryName)) {
      cacheDirectoryExists.set(
        directoryName,
        originalDirectoryExists(directoryName)
      );
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return cacheDirectoryExists.get(directoryName)!;
  };

  const cacheRealpath = new Map<string, string>();
  host.realpath = (path: string): string => {
    if (!cacheRealpath.has(path)) {
      cacheRealpath.set(path, originalRealpath(path));
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return cacheRealpath.get(path)!;
  };

  const cacheGetDirectories = new Map<string, string[]>();
  host.getDirectories = (path: string): string[] => {
    if (!cacheGetDirectories.has(path)) {
      cacheGetDirectories.set(path, originalGetDirectories(path));
    }
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return cacheGetDirectories.get(path)!;
  };
}

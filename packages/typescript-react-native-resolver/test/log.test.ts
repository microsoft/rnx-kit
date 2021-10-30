import fs from "fs";

import {
  ResolverLogMode,
  ResolverLog,
  changeModuleResolutionHostToLogFileSystemReads,
  shouldLogResolverFailure,
  logModuleBegin,
  logModuleEnd,
} from "../src/log";
import type { ModuleResolutionHostLike } from "../src/types";
import ts from "typescript";

const mockWriteFileSync = jest.fn();
fs.writeFileSync = mockWriteFileSync;

const mockConsoleLog = jest.fn();
console.log = mockConsoleLog;

describe("Log > ResolverLog", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("getMode returns the log mode", () => {
    const log = new ResolverLog(ResolverLogMode.Always);
    expect(log.getMode()).toEqual(ResolverLogMode.Always);
  });

  test("log messages are ignored when begin hasn't been called", () => {
    const log = new ResolverLog(ResolverLogMode.Always);
    log.log("test");
    expect(mockConsoleLog).not.toBeCalled();
  });

  test("log messages are buffered between a call to begin and a call to endSuccess", () => {
    const log = new ResolverLog(ResolverLogMode.Always);
    log.begin();
    log.log("test");
    expect(mockConsoleLog).not.toBeCalled();
    log.endSuccess();
    expect(mockConsoleLog).toBeCalledWith("test");
  });

  test("log messages are buffered between a call to begin and a call to endFailure", () => {
    const log = new ResolverLog(ResolverLogMode.Always);
    log.begin();
    log.log("test");
    expect(mockConsoleLog).not.toBeCalled();
    log.endFailure();
    expect(mockConsoleLog).toBeCalledWith("test");
  });

  test("no success log messages are written when logging is set to only report failures", () => {
    const log = new ResolverLog(ResolverLogMode.OnFailure);
    log.begin();
    log.log("test");
    expect(mockConsoleLog).not.toBeCalled();
    log.endSuccess();
    expect(mockConsoleLog).not.toBeCalled();
  });

  test("no failure log messages are written when logging is disabled", () => {
    const log = new ResolverLog(ResolverLogMode.Never);
    log.begin();
    log.log("test");
    expect(mockConsoleLog).not.toBeCalled();
    log.endFailure();
    expect(mockConsoleLog).not.toBeCalled();
  });

  test("log messages are flushed to a file instead of the console", () => {
    const log = new ResolverLog(ResolverLogMode.Always, "foo.log");
    log.begin();
    log.log("test");
    log.endSuccess();
    expect(mockWriteFileSync).toBeCalledWith(
      "foo.log",
      expect.anything(),
      expect.anything()
    );
  });
});

describe("Log > changeModuleResolutionHostToLogFileSystemReads", () => {
  const mockFileExists = jest.fn();
  const mockReadFile = jest.fn();
  const mockTrace = jest.fn();
  const mockDirectoryExists = jest.fn();
  const mockRealpath = jest.fn();
  const mockGetDirectories = jest.fn();

  afterEach(() => {
    jest.resetAllMocks();
  });

  function createHost(): ModuleResolutionHostLike {
    const host = {
      fileExists: mockFileExists,
      readFile: mockReadFile,
      trace: mockTrace,
      directoryExists: mockDirectoryExists,
      realpath: mockRealpath,
      getDirectories: mockGetDirectories,
    };
    changeModuleResolutionHostToLogFileSystemReads(host);
    return host;
  }

  test("fileExists calls original function", () => {
    const host = createHost();
    host.fileExists("some-file");
    expect(mockFileExists).toBeCalledWith("some-file");
  });

  test("fileExists does not log when the file exists", () => {
    const host = createHost();
    mockFileExists.mockReturnValue(true);
    expect(host.fileExists("file-that-exists")).toBeTrue();
    expect(mockTrace).not.toBeCalled();
  });

  test("fileExists logs when the file does not exist", () => {
    const host = createHost();
    mockFileExists.mockReturnValue(false);
    expect(host.fileExists("file-does-not-exist")).toBeFalse();
    expect(mockTrace).toBeCalled();
  });

  test("readFile calls original function", () => {
    const host = createHost();
    host.readFile("file-to-read");
    expect(mockReadFile).toBeCalledWith("file-to-read");
  });

  test("readFile logs on failure", () => {
    const host = createHost();
    mockReadFile.mockReturnValue(undefined);
    expect(host.readFile("file-does-not-exist")).toBeUndefined();
    expect(mockTrace).toBeCalled();
  });

  test("readFile logs on success", () => {
    const host = createHost();
    mockReadFile.mockReturnValue("contents of the def file");
    expect(host.readFile("file-exists")).toEqual("contents of the def file");
    expect(mockTrace).toBeCalled();
  });

  test("directoryExists calls original function", () => {
    const host = createHost();
    host.directoryExists("some-dir");
    expect(mockDirectoryExists).toBeCalledWith("some-dir");
  });

  test("directoryExists does not log when the directory exists", () => {
    const host = createHost();
    mockDirectoryExists.mockReturnValue(true);
    host.directoryExists("dir-exists");
    expect(mockTrace).not.toBeCalled();
  });

  test("directoryExists logs when the directory does not exist", () => {
    const host = createHost();
    mockDirectoryExists.mockReturnValue(false);
    host.directoryExists("dir-does-not-exist");
    expect(mockTrace).toBeCalled();
  });

  test("realpath calls original function", () => {
    const host = createHost();
    host.realpath("some-file");
    expect(mockRealpath).toBeCalledWith("some-file");
  });

  test("realpath does not log on failure", () => {
    const host = createHost();
    mockRealpath.mockReturnValue(undefined);
    expect(host.realpath("file-that-exists")).toBeUndefined();
    expect(mockTrace).not.toBeCalled();
  });

  test("realpath logs on success", () => {
    const host = createHost();
    mockRealpath.mockReturnValue("realpath-of-file");
    expect(host.realpath("file-that-exists")).toEqual("realpath-of-file");
    expect(mockTrace).toBeCalled();
  });

  test("getDirectories calls original function", () => {
    const host = createHost();
    host.getDirectories("some-parent-dir");
    expect(mockGetDirectories).toBeCalledWith("some-parent-dir");
  });

  test("getDirectories logs on failure", () => {
    const host = createHost();
    mockGetDirectories.mockReturnValue(undefined);
    expect(host.getDirectories("parent-dir")).toBeUndefined();
    expect(mockTrace).toBeCalled();
  });

  test("getDirectories logs on success", () => {
    const host = createHost();
    mockGetDirectories.mockReturnValue(["alpha", "beta", "sigma"]);
    expect(host.getDirectories("parent-dir")).toIncludeSameMembers([
      "alpha",
      "beta",
      "sigma",
    ]);
    expect(mockTrace).toBeCalled();
  });
});

describe("Log > shouldLogResolverFailure", () => {
  const options: ts.ParsedCommandLine["options"] = {};

  test("returns false for node modules", () => {
    expect(shouldLogResolverFailure(options, "fs")).toBeFalse();
    expect(shouldLogResolverFailure(options, "path")).toBeFalse();
    expect(shouldLogResolverFailure(options, "fs/promises")).toBeFalse();
    expect(shouldLogResolverFailure(options, "node:util")).toBeFalse();
  });

  test("returns false for JSON files when TypeScript is configured to ignore JSON modules", () => {
    expect(
      shouldLogResolverFailure({ resolveJsonModule: false }, "data.json")
    ).toBeFalse();
  });

  test("returns true for JSON files when TypeScript is configured to resolve JSON modules", () => {
    expect(
      shouldLogResolverFailure({ resolveJsonModule: true }, "data.json")
    ).toBeTrue();
  });

  test("returns false for multimedia files", () => {
    expect(shouldLogResolverFailure(options, "picture.jpg")).toBeFalse();
    expect(shouldLogResolverFailure(options, "video.mpeg")).toBeFalse();
    expect(shouldLogResolverFailure(options, "song.mp3")).toBeFalse();
    expect(shouldLogResolverFailure(options, "page.html")).toBeFalse();
    expect(shouldLogResolverFailure(options, "font.ttf")).toBeFalse();
  });

  test("returns false for code files", () => {
    expect(shouldLogResolverFailure(options, "styles.css")).toBeFalse();
  });

  test("returns true for normal modules", () => {
    expect(shouldLogResolverFailure(options, "find-up")).toBeTrue();
  });
});

const mockGetMode = jest.fn();
const mockBegin = jest.fn();
const mockLog = jest.fn();
const mockEndSuccess = jest.fn();
const mockEndFailure = jest.fn();
const mockReset = jest.fn();

const mockedResolverLog = {
  getMode: mockGetMode,
  begin: mockBegin,
  log: mockLog,
  endSuccess: mockEndSuccess,
  endFailure: mockEndFailure,
  reset: mockReset,
} as unknown as ResolverLog;

describe("Log > logModuleBegin", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("starts a new logging session", () => {
    logModuleBegin(mockedResolverLog, "moduleName", "index.ts");
    expect(mockBegin).toBeCalled();
  });

  test("logs a starting message", () => {
    logModuleBegin(mockedResolverLog, "moduleName", "index.ts");
    expect(mockLog).toBeCalled();
  });
});

describe("Log > logModuleEnd", () => {
  const options: ts.ParsedCommandLine["options"] = {};

  afterEach(() => {
    jest.resetAllMocks();
  });

  test("ends the current logging session successfully when the module was resolved", () => {
    logModuleEnd(mockedResolverLog, options, "clippy", {
      extension: ts.Extension.Ts,
      resolvedFileName: "clippy.native.ts",
    });
    expect(mockEndSuccess).toBeCalled();
    expect(mockEndFailure).not.toBeCalled();
  });

  test("logs an ending message when the module was resolved", () => {
    logModuleEnd(mockedResolverLog, options, "clippy", {
      extension: ts.Extension.Ts,
      resolvedFileName: "clippy.native.ts",
    });
    expect(mockLog).toBeCalled();
  });

  test("ends the current logging session as a failure when the module was not resolved", () => {
    logModuleEnd(mockedResolverLog, options, "bob", undefined);
    expect(mockEndSuccess).not.toBeCalled();
    expect(mockEndFailure).toBeCalled();
  });

  test("logs an ending message when the module was not resolved", () => {
    logModuleEnd(mockedResolverLog, options, "bob", undefined);
    expect(mockLog).toBeCalled();
  });

  test("resets the current logging session when the module resolution failure should not be reported", () => {
    logModuleEnd(mockedResolverLog, options, "fs", undefined);
    expect(mockEndSuccess).not.toBeCalled();
    expect(mockEndFailure).not.toBeCalled();
    expect(mockReset).toBeCalled();
  });
});

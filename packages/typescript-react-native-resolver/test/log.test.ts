import fs from "fs";

import { isTraceEnabled, logModuleBegin, logModuleEnd } from "../src/log";
import type { ModuleResolutionHostLike } from "../src/types";
import ts from "typescript";

const mockTrace = jest.fn();

const mockHost = {
  trace: mockTrace,
} as unknown as ModuleResolutionHostLike;

const options: ts.CompilerOptions = { traceResolution: true };

describe("Log > isTraceEnabled", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("isTraceEnabled returns true", () => {
    expect(isTraceEnabled(mockHost, options)).toBeTrue();
  });

  test("isTraceEnabled returns false when option is disabled", () => {
    expect(isTraceEnabled(mockHost, {})).toBeFalse();
  });

  test("isTraceEnabled returns false when trace function is missing", () => {
    expect(isTraceEnabled({} as ModuleResolutionHostLike, options)).toBeFalse();
  });
});

describe("Log > logModuleBegin", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("logs a starting message", () => {
    logModuleBegin(mockHost, options, "moduleName", "index.ts");
    expect(mockTrace).toBeCalled();
  });
});

describe("Log > logModuleEnd", () => {
  afterEach(() => {
    jest.resetAllMocks();
  });

  test("logs an ending message when the module was resolved", () => {
    logModuleEnd(mockHost, options, "clippy", {
      extension: ts.Extension.Ts,
      resolvedFileName: "clippy.native.ts",
    });
    expect(mockTrace).toBeCalled();
  });

  test("logs an ending message when the module was not resolved", () => {
    logModuleEnd(mockHost, options, "bob", undefined);
    expect(mockTrace).toBeCalled();
  });
});

import fs from "node:fs";
import {
  getFileStream,
  getWriteFunctions,
  outputSettingsChanging,
  supportsLevel,
  type OutputSettings,
  type WriteFunctions,
} from "../src/output.ts";
import type { LogLevel } from "../src/types.ts";

describe("supportsLevel", () => {
  it("returns true if level is less than or equal to optionLevel", () => {
    expect(supportsLevel("error", "log")).toBe(true);
    expect(supportsLevel("warn", "log")).toBe(true);
    expect(supportsLevel("log", "log")).toBe(true);
    expect(supportsLevel("verbose", "log")).toBe(false);
  });

  it("defaults optionLevel to 'log'", () => {
    expect(supportsLevel("error")).toBe(true);
    expect(supportsLevel("warn")).toBe(true);
    expect(supportsLevel("log")).toBe(true);
    expect(supportsLevel("verbose")).toBe(false);
  });

  it("returns false if level is higher than optionLevel", () => {
    expect(supportsLevel("verbose", "warn")).toBe(false);
    expect(supportsLevel("log", "warn")).toBe(false);
  });
});

describe("outputSettingsChanging", () => {
  const prev = {
    level: "log" as LogLevel,
    file: {
      target: "file.log",
      level: "log" as LogLevel,
      writeFlags: "w",
      colors: false,
    },
  };

  it("returns false if no overrides", () => {
    expect(outputSettingsChanging(prev)).toBe(false);
  });

  it("returns true if level changes", () => {
    expect(outputSettingsChanging(prev, { level: "error" })).toBe(true);
  });

  it("returns true if file.target changes", () => {
    expect(
      outputSettingsChanging(prev, {
        file: { ...prev.file, target: "other.log" },
      })
    ).toBe(true);
  });

  it("returns true if file.level changes", () => {
    expect(
      outputSettingsChanging(prev, { file: { ...prev.file, level: "error" } })
    ).toBe(true);
  });

  it("returns true if file.writeFlags changes", () => {
    expect(
      outputSettingsChanging(prev, { file: { ...prev.file, writeFlags: "a" } })
    ).toBe(true);
  });

  it("returns true if file.colors changes", () => {
    expect(
      outputSettingsChanging(prev, { file: { ...prev.file, colors: true } })
    ).toBe(true);
  });

  it("returns false if nothing changes", () => {
    expect(outputSettingsChanging(prev, { file: { ...prev.file } })).toBe(
      false
    );
  });
});

describe("getFileStream", () => {
  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("returns undefined if no settings", () => {
    expect(getFileStream(undefined)).toBeUndefined();
  });

  it("creates a write stream if target is a string", () => {
    const mockStream = {} as fs.WriteStream;
    const mkdirSync = jest
      .spyOn(fs, "mkdirSync")
      .mockImplementation(() => undefined);
    const createWriteStream = jest
      .spyOn(fs, "createWriteStream")
      .mockReturnValue(mockStream);

    const fileSettings = { target: "./test.log" };
    const stream = getFileStream(fileSettings);

    expect(mkdirSync).toHaveBeenCalled();
    expect(createWriteStream).toHaveBeenCalled();
    expect(fileSettings.target).toBeDefined();
    expect(stream).toBe(fileSettings.target);
  });

  it("returns the target if it's already a stream", () => {
    const fakeStream = {} as fs.WriteStream;
    const fileSettings = { target: fakeStream };
    expect(getFileStream(fileSettings)).toBe(fakeStream);
  });
});

describe("getWriteFunctions", () => {
  it("returns parentWrites if not changed", () => {
    const parent: WriteFunctions = { error: jest.fn(), warn: jest.fn() };
    const settings = { level: "log" as LogLevel };
    expect(getWriteFunctions(settings, false, parent)).toBe(parent);
  });

  it("returns new write functions if changed", () => {
    const settings = { level: "log" as LogLevel };
    const writes = getWriteFunctions(settings, true);
    expect(typeof writes.error).toBe("function");
    expect(typeof writes.warn).toBe("function");
    expect(typeof writes.log).toBe("function");
    expect(writes.verbose).toBeUndefined();
  });

  it("returns different results for different levels", () => {
    const settings = { level: "warn" as LogLevel };
    const writes = getWriteFunctions(settings, true);
    expect(typeof writes.error).toBe("function");
    expect(typeof writes.warn).toBe("function");
    expect(writes.log).toBeUndefined();
    expect(writes.verbose).toBeUndefined();
  });

  it("includes file write functions if file is set", () => {
    const fakeStream = { write: jest.fn() };
    const settings = {
      level: "log" as LogLevel,
      file: { target: fakeStream, level: "log" as LogLevel, colors: false },
    } as unknown as OutputSettings;
    const writes = getWriteFunctions(settings, true);
    expect(typeof writes.error).toBe("function");
    expect(typeof writes.warn).toBe("function");
    expect(typeof writes.log).toBe("function");
  });
});

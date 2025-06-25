import fs from "node:fs";
import path from "node:path";
import {
  getFileStream,
  getOutput,
  outputSettingsChanging,
  updateDefaultOutput,
} from "../src/output";
import type { OutputSettings } from "../src/types";

describe("output", () => {
  it("getOutput returns output object and respects overrides", () => {
    const out = getOutput({ level: "error" });
    expect(out.level).toBe("error");
    expect(typeof out.error).toBe("function");
  });

  it("updateOutputDefaults does not throw", () => {
    expect(() => updateDefaultOutput({ level: "warn" })).not.toThrow();
  });

  it("outputSettingsChanging detects changes", () => {
    const prev: OutputSettings = { level: "log" };
    expect(outputSettingsChanging(prev)).toBe(false);
    expect(outputSettingsChanging(prev, { level: "error" })).toBe(true);
    expect(outputSettingsChanging(prev, { file: { target: "file.log" } })).toBe(
      false
    );
  });

  it("getFileStream returns undefined for no file, or a WriteStream for a string target", () => {
    expect(getFileStream(undefined)).toBeUndefined();
    const tmpFile = path.join(__dirname, "test.log");
    const stream = getFileStream({ target: tmpFile });
    expect(stream).toBeDefined();
    stream?.close(() => fs.rmSync(tmpFile));
  });
});

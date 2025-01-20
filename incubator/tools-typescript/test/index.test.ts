import { extractOptions } from "../src/bin/ts-tool";

describe("Command line options", () => {
  let consoleErrorSpy: jest.SpyInstance;
  let processExitSpy: jest.SpyInstance;

  beforeEach(() => {
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();
    processExitSpy = jest
      .spyOn(process, "exit")
      .mockImplementation((exitWith) => {
        throw new Error(`process.exit(${exitWith})`);
      });
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
    processExitSpy.mockRestore();
  });

  it("should find boolean options", () => {
    const args = ["--detectPlatforms", "--noTypecheck=true"];
    const options = extractOptions(args);
    expect(options.detectPlatforms).toBe(true);
    expect(options.noTypecheck).toBe(true);
  });

  it("should correctly set boolean options to false", () => {
    const args = ["--detectPlatforms=false", "--noTypecheck"];
    const options = extractOptions(args);
    expect(options.detectPlatforms).toBe(false);
    expect(options.noTypecheck).toBe(true);
  });

  it("should find platform options with multiple entries", () => {
    const args = ["--platforms=android,ios,macos"];
    const options = extractOptions(args);
    expect(options.platforms).toEqual(["android", "ios", "macos"]);
  });

  it("should find platform options with a single entry", () => {
    const args = ["--platforms=android"];
    const options = extractOptions(args);
    expect(options.platforms).toEqual(["android"]);
  });

  it("should error on no platform specified", () => {
    const args = ["--platforms="];
    expect(() => extractOptions(args)).toThrow("process.exit(1)");
    const args2 = ["--platforms"];
    expect(() => extractOptions(args2)).toThrow("process.exit(1)");
  });

  it("should error on invalid platform specified", () => {
    const args = ["--platforms=android,ios,invalid,windows"];
    expect(() => extractOptions(args)).toThrow("process.exit(1)");
  });

  it("should find help option", () => {
    const args = ["--help"];
    const options = extractOptions(args);
    expect(options.help).toBe(true);
  });

  it("should leave typescript options intact", () => {
    const args = ["--noEmit", "--outDir", "dist"];
    const argsOriginal = [...args];
    extractOptions(args);
    expect(args).toEqual(argsOriginal);
  });

  it("should extract options from arg array leaving typescript options", () => {
    const args = [
      "--noCheck",
      "--platforms=android,ios",
      "--noTypecheck",
      "--noEmit",
      "--outDir",
      "dist",
    ];
    const options = extractOptions(args);
    expect(options.noTypecheck).toBe(true);
    expect(options.platforms).toEqual(["android", "ios"]);
    expect(args).toEqual(["--noCheck", "--noEmit", "--outDir", "dist"]);
  });
});

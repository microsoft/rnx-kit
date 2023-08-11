import { error } from "@rnx-kit/console";
import * as fs from "fs";
import { hideBin } from "yargs/helpers";
import { checkArgumentValidity } from "../src/check_arguments_validity";

jest.mock("@rnx-kit/console");
jest.mock("fs");
jest.mock("yargs/helpers");

describe("Testing checkArgumentValidity", () => {
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    errorSpy = error as jest.MockedFunction<typeof error>;
  });

  test("if error file does not exist, print out the appropriate error message", () => {
    (hideBin as jest.MockedFunction<typeof hideBin>).mockReturnValue([
      "--configFile",
      "./errortracedata/config.json",
      "--errorFile",
      "./errortracedata/error.txt",
    ]);
    jest
      .spyOn(fs, "existsSync")
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    expect(
      checkArgumentValidity([
        "--configFile",
        "./errortracedata/config.json",
        "--errorFile",
        "./errortracedata/error.txt",
      ])
    ).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  test("if all arguments are valid, return true", () => {
    (hideBin as jest.MockedFunction<typeof hideBin>).mockReturnValue([
      "--configFile",
      "./errortracedata/config.json",
      "--errorFile",
      "./errortracedata/error.txt",
    ]);
    (fs.existsSync as jest.MockedFunction<typeof fs.existsSync>)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    expect(
      checkArgumentValidity([
        "--configFile",
        "./errortracedata/config.json",
        "--errorFile",
        "./errortracedata/error.txt",
      ])
    ).toStrictEqual({
      configFile: "./errortracedata/config.json",
      errorFile: "./errortracedata/error.txt",
    });
  });

  test("if configFile param is not passed, expect error", () => {
    (hideBin as jest.MockedFunction<typeof hideBin>).mockReturnValue([
      "--errorFile",
      "./errortracedata/error.txt",
    ]);
    try {
      checkArgumentValidity(["--errorFile", "./errortracedata/error.txt"]);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });

  test("if config file does not exist, print out the appropriate error message", () => {
    (hideBin as jest.MockedFunction<typeof hideBin>).mockReturnValue([
      "--configFile",
      "./errortracedata/config.json",
      "--errorFile",
      "./errortracedata/error.txt",
    ]);
    (
      fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
    ).mockReturnValueOnce(false);
    expect(
      checkArgumentValidity([
        "--configFile",
        "./errortracedata/config.json",
        "--errorFile",
        "./errortracedata/error.txt",
      ])
    ).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  test("if errorFile param is not passed, expect error", () => {
    (hideBin as jest.MockedFunction<typeof hideBin>).mockReturnValue([
      "--configFile",
      "./errortracedata/config.json",
    ]);
    (
      fs.existsSync as jest.MockedFunction<typeof fs.existsSync>
    ).mockReturnValueOnce(true);
    try {
      checkArgumentValidity(["--configFile", "./errortracedata/config.json"]);
    } catch (e) {
      expect(e).toBeInstanceOf(Error);
    }
  });
});

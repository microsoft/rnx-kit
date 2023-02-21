import { error, info } from "@rnx-kit/console";
import * as fse from "fs-extra";
import { checkArgumentValidity } from "../src/check_arguments_validity";

jest.mock("@rnx-kit/console");
jest.mock("fs-extra");
jest.mock("minimist");

describe("Testing checkArgumentValidity", () => {
  let infoSpy: jest.SpyInstance;
  let errorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    infoSpy = info as jest.MockedFunction<typeof info>;
    errorSpy = error as jest.MockedFunction<typeof error>;
  });

  test("If help flag is passed, print help and return false", () => {
    expect(checkArgumentValidity({ help: true } as never)).toBe(false);
    expect(infoSpy).toHaveBeenCalledTimes(2);
  });

  test("if configFile param is not passed, deem the arguments invalid and print help", () => {
    expect(checkArgumentValidity({} as never)).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(2);
  });

  test("if config file does not exist, print out the appropriate error message", () => {
    (
      fse.existsSync as jest.MockedFunction<typeof fse.existsSync>
    ).mockReturnValueOnce(false);
    expect(
      checkArgumentValidity({ configFile: "path/to/config/file" } as never)
    ).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  test("if errorFile param is not passed, deem the arguments invalid and print help", () => {
    (
      fse.existsSync as jest.MockedFunction<typeof fse.existsSync>
    ).mockReturnValueOnce(true);
    expect(
      checkArgumentValidity({ configFile: "path/to/config/file" } as never)
    ).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    expect(infoSpy).toHaveBeenCalledTimes(2);
  });

  test("if error file does not exist, print out the appropriate error message", () => {
    (fse.existsSync as jest.MockedFunction<typeof fse.existsSync>)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(false);
    expect(
      checkArgumentValidity({
        configFile: "path/to/config/file",
        errorFile: "path/to/error/file",
      } as never)
    ).toBe(false);
    expect(errorSpy).toHaveBeenCalledTimes(1);
  });

  test("if all arguments are valid, return true", () => {
    (fse.existsSync as jest.MockedFunction<typeof fse.existsSync>)
      .mockReturnValueOnce(true)
      .mockReturnValueOnce(true);
    expect(
      checkArgumentValidity({
        configFile: "path/to/config/file",
        errorFile: "path/to/error/file",
      } as never)
    ).toBe(true);
  });
});

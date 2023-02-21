import * as fse from "fs-extra";
import { isConfigFileValid, symbolicateBuffer } from "../src/utils";
import { extractAndSymbolicateErrorStack } from "../src/extract_and_process_error_stack";

jest.mock("fs-extra");
jest.mock("../src/utils");

const mockConfigFile = {
  configs: [
    { bundleIdentifier: "test1", sourcemap: "test1.map" },
    { bundleIdentifier: "test2", sourcemap: "test2.map" },
  ],
};

describe("Testing extractAndSymbolicateErrorStack", () => {
  let readFileSyncSpy;
  let logSpy;
  let isConfigFileValidSpy;
  let symbolicateBufferSpy;

  beforeEach(() => {
    jest.clearAllMocks();
    readFileSyncSpy = jest
      .spyOn(fse, "readFileSync")
      .mockReturnValue(JSON.stringify(mockConfigFile));
    logSpy = jest.spyOn(console, "log").mockImplementation();
    symbolicateBufferSpy = symbolicateBuffer as jest.MockedFunction<
      typeof symbolicateBuffer
    >;
  });

  it("should call readFileSyncSpy with correct arguments", () => {
    const errorFilePath = "errorFilePath";
    const configFilePath = "configFilePath";
    extractAndSymbolicateErrorStack(errorFilePath, configFilePath);
    expect(readFileSyncSpy).toHaveBeenCalledWith(configFilePath, "utf8");
  });

  it("should not do anything when config file is not valid", () => {
    const errorFilePath = "errorFilePath";
    const configFilePath = "configFilePath";
    isConfigFileValidSpy = (
      isConfigFileValid as jest.MockedFunction<typeof isConfigFileValid>
    ).mockReturnValue(false);
    extractAndSymbolicateErrorStack(errorFilePath, configFilePath);
    expect(isConfigFileValidSpy).toBeCalled();
    expect(symbolicateBufferSpy).not.toBeCalled();
  });

  it("should not call symbolicateBufferSpy if error contains no matches to configs", () => {
    const errorFilePath = "errorFilePath";
    const configFilePath = "configFilePath";
    isConfigFileValidSpy = (
      isConfigFileValid as jest.MockedFunction<typeof isConfigFileValid>
    ).mockReturnValue(true);
    const errorFile = "errorFile";
    readFileSyncSpy
      .mockReturnValueOnce(JSON.stringify(mockConfigFile))
      .mockReturnValueOnce(errorFile);
    extractAndSymbolicateErrorStack(errorFilePath, configFilePath);
    expect(symbolicateBufferSpy).not.toBeCalled();
    expect(logSpy).toBeCalledTimes(1);
  });

  it("should call symbolicateBufferSpy if error contains matches to configs", () => {
    const errorFilePath = "errorFilePath";
    const configFilePath = "configFilePath";
    isConfigFileValidSpy = (
      isConfigFileValid as jest.MockedFunction<typeof isConfigFileValid>
    ).mockReturnValue(true);
    const errorFile = "normalLine\ntest1:1:1\ntest2:2:2";
    readFileSyncSpy
      .mockReturnValueOnce(JSON.stringify(mockConfigFile))
      .mockReturnValueOnce(errorFile);
    extractAndSymbolicateErrorStack(errorFilePath, configFilePath);
    expect(symbolicateBufferSpy).toBeCalledTimes(2);
    expect(logSpy).toBeCalledTimes(1);
  });

  it("should group lines with same bundleIdentifier and call symbolicateBufferSpy for them", () => {
    const errorFilePath = "errorFilePath";
    const configFilePath = "configFilePath";
    isConfigFileValidSpy = (
      isConfigFileValid as jest.MockedFunction<typeof isConfigFileValid>
    ).mockReturnValue(true);
    const errorFile = "test1:1:1\ntest1:2:2\nnormalLine\ntest2:2:2\ntest2:2:2";
    readFileSyncSpy
      .mockReturnValueOnce(JSON.stringify(mockConfigFile))
      .mockReturnValueOnce(errorFile);
    extractAndSymbolicateErrorStack(errorFilePath, configFilePath);
    expect(symbolicateBufferSpy).toBeCalledTimes(2);
    expect(logSpy).toBeCalledTimes(1);
  });
});

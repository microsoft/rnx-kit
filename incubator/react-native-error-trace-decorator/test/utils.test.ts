import { symbolicateBuffer, isConfigFileValid } from "../src/utils";
import * as fse from "fs-extra";
import * as ChildProcess from "child_process";
import { error } from "@rnx-kit/console";
import type { IConfigFile } from "../src/types";

jest.mock("fs-extra");
jest.mock("child_process");
jest.mock("@rnx-kit/console");

describe("Testing utils", () => {
  describe("Testing symbolicateBuffer", () => {
    let writeFileSyncSpy;
    let removeSyncSpy;
    let execSyncSpy;
    let logSpy;

    beforeEach(() => {
      jest.clearAllMocks();
      writeFileSyncSpy = jest.spyOn(fse, "writeFileSync");
      removeSyncSpy = jest.spyOn(fse, "removeSync");
      execSyncSpy = jest.spyOn(ChildProcess, "execSync");
      logSpy = jest.spyOn(console, "log").mockImplementation();
    });

    it("should call ChildProcess.execSync when buffer is non-empty", () => {
      const buffer = ["line1", "line2"];
      const sourcemap = "sourcemap";
      symbolicateBuffer(buffer, sourcemap);
      expect(execSyncSpy).toBeCalled();
      expect(writeFileSyncSpy).toBeCalledTimes(1);
      expect(removeSyncSpy).toBeCalledTimes(1);
      expect(logSpy).toBeCalledTimes(1);
    });

    it("should not call ChildProcess.execSync when buffer is empty", () => {
      const buffer = [];
      const sourcemap = "sourcemap";

      symbolicateBuffer(buffer, sourcemap);
      expect(execSyncSpy).not.toBeCalled();
      expect(writeFileSyncSpy).not.toBeCalled();
      expect(removeSyncSpy).not.toBeCalled();
    });
  });

  describe("Testing checkIfConfigFileIsValid", () => {
    let existsSyncSpy;
    let errorSpy;

    beforeEach(() => {
      jest.clearAllMocks();
      existsSyncSpy = jest.spyOn(fse, "existsSync");
      errorSpy = error as jest.MockedFunction<typeof error>;
    });

    it("should return false when configs is not defined", () => {
      const configFile = {};
      expect(isConfigFileValid(configFile as IConfigFile)).toBe(false);
      expect(existsSyncSpy).not.toBeCalled();
      expect(errorSpy).not.toBeCalled();
    });

    it("should return false when configs is empty", () => {
      const configFile = { configs: [] };
      expect(isConfigFileValid(configFile)).toBe(false);
      expect(existsSyncSpy).not.toBeCalled();
      expect(errorSpy).toBeCalledTimes(1);
    });

    it("should return false when sourcemap is not defined", () => {
      const configFile = {
        configs: [{ bundleIdentifier: "bundleId" }],
      };
      expect(isConfigFileValid(configFile as IConfigFile)).toBe(false);
      expect(existsSyncSpy).not.toBeCalled();
      expect(errorSpy).toBeCalled();
    });

    it("should return false when sourcemap does not exist", () => {
      const configFile = {
        configs: [{ bundleIdentifier: "bundleId", sourcemap: "sourcemap" }],
      };
      existsSyncSpy.mockReturnValue(false);
      expect(isConfigFileValid(configFile)).toBe(false);
      expect(existsSyncSpy).toBeCalled();
      expect(errorSpy).toBeCalled();
    });

    it("should return false when bundleIdentifier is not defined", () => {
      const configFile = {
        configs: [{ sourcemap: "sourcemap" }],
      };
      existsSyncSpy.mockReturnValue(true);
      expect(isConfigFileValid(configFile as IConfigFile)).toBe(false);
      expect(existsSyncSpy).toBeCalled();
      expect(errorSpy).toBeCalled();
    });

    it("should return true when all conditions are met", () => {
      const configFile = {
        configs: [{ bundleIdentifier: "bundleId", sourcemap: "sourcemap" }],
      };
      existsSyncSpy.mockReturnValue(true);
      expect(isConfigFileValid(configFile)).toBe(true);
      expect(existsSyncSpy).toBeCalled();
      expect(errorSpy).not.toBeCalled();
    });
  });
});

import { error } from "@rnx-kit/console";
import * as fse from "fs";
import type { IConfigFile } from "../src/types";
import { isConfigFileValid, symbolicateBuffer } from "../src/utils";

jest.mock("fs");
jest.mock("@rnx-kit/console");

describe("Testing utils", () => {
  describe("Testing symbolicateBuffer", () => {
    let logSpy;

    beforeEach(() => {
      jest.clearAllMocks();
      logSpy = jest.spyOn(console, "log").mockImplementation();
    });

    it("should call symbolicate when buffer is non-empty", () => {
      const buffer = ["line1", "line2"];
      const sourcemap = {
        symbolicate: jest.fn(),
      };
      symbolicateBuffer(buffer, sourcemap);
      expect(sourcemap.symbolicate).toHaveBeenCalledWith("line1\nline2");
      expect(logSpy).toHaveBeenCalledTimes(1);
    });

    it("should not call symbolicate when buffer is empty", () => {
      const buffer = [];
      const sourcemap = {
        symbolicate: jest.fn(),
      };

      symbolicateBuffer(buffer, sourcemap);
      expect(sourcemap.symbolicate).not.toHaveBeenCalled();
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
      expect(existsSyncSpy).not.toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalled();
    });

    it("should return false when configs is empty", () => {
      const configFile = { configs: [] };
      expect(isConfigFileValid(configFile)).toBe(false);
      expect(existsSyncSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalledTimes(1);
    });

    it("should return false when sourcemap is not defined", () => {
      const configFile = {
        configs: [{ bundleIdentifier: "bundleId" }],
      };
      expect(isConfigFileValid(configFile as IConfigFile)).toBe(false);
      expect(existsSyncSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });

    it("should return false when sourcemap does not exist", () => {
      const configFile = {
        configs: [{ bundleIdentifier: "bundleId", sourcemap: "sourcemap" }],
      };
      existsSyncSpy.mockReturnValue(false);
      expect(isConfigFileValid(configFile)).toBe(false);
      expect(existsSyncSpy).toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });

    it("should return false when bundleIdentifier is not defined", () => {
      const configFile = {
        configs: [{ sourcemap: "sourcemap" }],
      };
      existsSyncSpy.mockReturnValue(true);
      expect(isConfigFileValid(configFile as IConfigFile)).toBe(false);
      expect(existsSyncSpy).not.toHaveBeenCalled();
      expect(errorSpy).toHaveBeenCalled();
    });

    it("should return true when all conditions are met", () => {
      const configFile = {
        configs: [{ bundleIdentifier: "bundleId", sourcemap: "sourcemap" }],
      };
      existsSyncSpy.mockReturnValue(true);
      expect(isConfigFileValid(configFile)).toBe(true);
      expect(existsSyncSpy).toHaveBeenCalled();
      expect(errorSpy).not.toHaveBeenCalledTimes(1);
    });
  });
});

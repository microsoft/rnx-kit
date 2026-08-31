import type { Config } from "@react-native-community/cli-types";
import { runMacOS } from "../../src/run/macos.ts";

type Logger = {
  text: string;
  info: jest.Mock;
  start: jest.Mock;
  succeed: jest.Mock;
  fail: jest.Mock;
};

let mockLogger: Logger;

jest.mock("ora", () => ({
  __esModule: true,
  default: () => mockLogger,
}));

const mockBuildMacOS = jest.fn();
jest.mock("../../src/build/macos.ts", () => ({
  buildMacOS: (...args: unknown[]) => mockBuildMacOS(...args),
}));

const mockTools = {
  getBuildSettings: jest.fn(),
  open: jest.fn(),
};
jest.mock("@rnx-kit/tools-apple", () => ({
  getBuildSettings: (...args: unknown[]) => mockTools.getBuildSettings(...args),
  open: (...args: unknown[]) => mockTools.open(...args),
}));

describe("runMacOS", () => {
  const buildResult = { xcworkspace: "App.xcworkspace", args: [] };

  const settings = {
    buildSettings: {
      FULL_PRODUCT_NAME: "App.app",
      TARGET_BUILD_DIR: "/build",
    },
  };

  const config = {} as Config;
  const savedExitCode = process.exitCode;

  beforeEach(() => {
    mockLogger = {
      text: "",
      info: jest.fn(),
      start: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    };
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.exitCode = savedExitCode;
  });

  it("stops when the build did not produce a result", async () => {
    mockBuildMacOS.mockResolvedValueOnce(1);

    await runMacOS(config, {} as never);

    expect(mockTools.getBuildSettings).not.toHaveBeenCalled();
  });

  it("fails when build settings cannot be read", async () => {
    process.exitCode = 0;
    mockBuildMacOS.mockResolvedValueOnce(buildResult);
    mockTools.getBuildSettings.mockResolvedValueOnce(undefined);

    await runMacOS(config, {} as never);

    expect(mockLogger.fail).toHaveBeenCalledWith(
      "Failed to launch app: Could not get build settings"
    );
    expect(process.exitCode).toBe(1);
  });

  it("fails when the app cannot be opened", async () => {
    process.exitCode = 0;
    mockBuildMacOS.mockResolvedValueOnce(buildResult);
    mockTools.getBuildSettings.mockResolvedValueOnce(settings);
    mockTools.open.mockResolvedValueOnce({ status: 1, stderr: "nope" });

    await runMacOS(config, {} as never);

    expect(mockLogger.fail).toHaveBeenCalledWith("Failed to launch app: nope");
    expect(process.exitCode).toBe(1);
  });

  it("launches the app on success", async () => {
    mockBuildMacOS.mockResolvedValueOnce(buildResult);
    mockTools.getBuildSettings.mockResolvedValueOnce(settings);
    mockTools.open.mockResolvedValueOnce({ status: 0, stderr: "" });

    await runMacOS(config, {} as never);

    expect(mockLogger.succeed).toHaveBeenCalledWith("Launched 'App.app'");
  });
});

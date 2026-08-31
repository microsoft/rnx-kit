import type { Config } from "@react-native-community/cli-types";
import { runIOS } from "../../src/run/ios.ts";

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

const mockBuildIOS = jest.fn();
jest.mock("../../src/build/ios.ts", () => ({
  buildIOS: (...args: unknown[]) => mockBuildIOS(...args),
}));

const mockTools = {
  getBuildSettings: jest.fn(),
  getDevicePlatformIdentifier: jest.fn(() => "ios"),
  install: jest.fn(),
  launch: jest.fn(),
  selectDevice: jest.fn(),
};
jest.mock("@rnx-kit/tools-apple", () => ({
  getBuildSettings: (...args: unknown[]) => mockTools.getBuildSettings(...args),
  getDevicePlatformIdentifier: (...args: unknown[]) =>
    mockTools.getDevicePlatformIdentifier(...args),
  install: (...args: unknown[]) => mockTools.install(...args),
  launch: (...args: unknown[]) => mockTools.launch(...args),
  selectDevice: (...args: unknown[]) => mockTools.selectDevice(...args),
}));

describe("runIOS", () => {
  const buildResult = {
    xcworkspace: "App.xcworkspace",
    args: ["-scheme", "App"],
  };

  const settings = {
    buildSettings: {
      EXECUTABLE_FOLDER_PATH: "App.app",
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

  it("throws for non-iOS platforms", async () => {
    await expect(
      runIOS(config, { platform: "android" } as never)
    ).rejects.toThrow("Expected iOS/visionOS build configuration");
  });

  it("stops when the build did not produce a result", async () => {
    mockBuildIOS.mockResolvedValueOnce(1);

    await runIOS(config, { platform: "ios" } as never);

    expect(mockTools.getBuildSettings).not.toHaveBeenCalled();
  });

  it("fails when build settings cannot be read", async () => {
    process.exitCode = 0;
    mockBuildIOS.mockResolvedValueOnce(buildResult);
    mockTools.getBuildSettings.mockResolvedValueOnce(undefined);
    mockTools.selectDevice.mockResolvedValueOnce({ name: "iPhone" });

    await runIOS(config, { platform: "ios" } as never);

    expect(mockLogger.fail).toHaveBeenCalledWith(
      "Failed to launch app: Could not get build settings"
    );
    expect(process.exitCode).toBe(1);
  });

  it("fails when no device is found", async () => {
    process.exitCode = 0;
    mockBuildIOS.mockResolvedValueOnce(buildResult);
    mockTools.getBuildSettings.mockResolvedValueOnce(settings);
    mockTools.selectDevice.mockResolvedValueOnce(undefined);

    await runIOS(config, { platform: "ios" } as never);

    expect(mockLogger.fail).toHaveBeenCalledWith(
      "Failed to launch app: Could not find an appropriate device"
    );
    expect(process.exitCode).toBe(1);
  });

  it("fails when installation fails", async () => {
    process.exitCode = 0;
    mockBuildIOS.mockResolvedValueOnce(buildResult);
    mockTools.getBuildSettings.mockResolvedValueOnce(settings);
    mockTools.selectDevice.mockResolvedValueOnce({ name: "iPhone" });
    mockTools.install.mockResolvedValueOnce(new Error("install failed"));

    await runIOS(config, { platform: "ios" } as never);

    expect(mockLogger.fail).toHaveBeenCalledWith("install failed");
    expect(process.exitCode).toBe(1);
    expect(mockTools.launch).not.toHaveBeenCalled();
  });

  it("fails when launch fails", async () => {
    process.exitCode = 0;
    mockBuildIOS.mockResolvedValueOnce(buildResult);
    mockTools.getBuildSettings.mockResolvedValueOnce(settings);
    mockTools.selectDevice.mockResolvedValueOnce({ name: "iPhone" });
    mockTools.install.mockResolvedValueOnce(undefined);
    mockTools.launch.mockResolvedValueOnce(new Error("launch failed"));

    await runIOS(config, { platform: "ios" } as never);

    expect(mockLogger.fail).toHaveBeenCalledWith("launch failed");
    expect(process.exitCode).toBe(1);
  });

  it("installs and launches the app on success", async () => {
    mockBuildIOS.mockResolvedValueOnce(buildResult);
    mockTools.getBuildSettings.mockResolvedValueOnce(settings);
    mockTools.selectDevice.mockResolvedValueOnce({ name: "iPhone" });
    mockTools.install.mockResolvedValueOnce(undefined);
    mockTools.launch.mockResolvedValueOnce(undefined);

    await runIOS(config, { platform: "ios", device: "iPhone 15" } as never);

    // A named device skips `getDevicePlatformIdentifier`.
    expect(mockTools.getDevicePlatformIdentifier).not.toHaveBeenCalled();
    expect(mockTools.selectDevice).toHaveBeenCalledWith(
      "iPhone 15",
      "simulator",
      mockLogger
    );
    expect(mockLogger.succeed).toHaveBeenCalledWith(
      "Started 'App.app' on iPhone"
    );
  });

  it("resolves the device platform identifier when no device is named", async () => {
    mockBuildIOS.mockResolvedValueOnce(buildResult);
    mockTools.getBuildSettings.mockResolvedValueOnce(settings);
    mockTools.selectDevice.mockResolvedValueOnce({ name: "iPhone" });
    mockTools.install.mockResolvedValueOnce(undefined);
    mockTools.launch.mockResolvedValueOnce(undefined);

    await runIOS(config, { platform: "visionos" } as never);

    expect(mockTools.getDevicePlatformIdentifier).toHaveBeenCalledTimes(1);
    expect(mockTools.selectDevice).toHaveBeenCalledWith(
      "ios",
      "simulator",
      mockLogger
    );
  });
});

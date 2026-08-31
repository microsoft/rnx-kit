import type { Config } from "@react-native-community/cli-types";
import { runAndroid } from "../../src/run/android.ts";

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

const mockBuildAndroid = jest.fn();
jest.mock("../../src/build/android.ts", () => ({
  buildAndroid: (...args: unknown[]) => mockBuildAndroid(...args),
}));

const mockTools = {
  findOutputFile: jest.fn(),
  getPackageName: jest.fn(),
  install: jest.fn(),
  selectDevice: jest.fn(),
  start: jest.fn(),
};
jest.mock("@rnx-kit/tools-android", () => ({
  findOutputFile: (...args: unknown[]) => mockTools.findOutputFile(...args),
  getPackageName: (...args: unknown[]) => mockTools.getPackageName(...args),
  install: (...args: unknown[]) => mockTools.install(...args),
  selectDevice: (...args: unknown[]) => mockTools.selectDevice(...args),
  start: (...args: unknown[]) => mockTools.start(...args),
}));

describe("runAndroid", () => {
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

  it("stops when the build did not produce a project directory", async () => {
    mockBuildAndroid.mockResolvedValueOnce(1);

    await runAndroid(config, { platform: "android" } as never, []);

    expect(mockTools.findOutputFile).not.toHaveBeenCalled();
  });

  it("fails when no APK is found", async () => {
    process.exitCode = 0;
    mockBuildAndroid.mockResolvedValueOnce("/repo/android");
    mockTools.findOutputFile.mockReturnValueOnce([]);

    await runAndroid(config, { platform: "android" } as never, []);

    expect(mockLogger.fail).toHaveBeenCalledWith(
      "Failed to find the APK that was just built"
    );
    expect(process.exitCode).toBe(1);
  });

  it("fails when the package name cannot be determined", async () => {
    process.exitCode = 0;
    mockBuildAndroid.mockResolvedValueOnce("/repo/android");
    mockTools.findOutputFile.mockReturnValueOnce(["app.apk"]);
    mockTools.getPackageName.mockReturnValueOnce(new Error("bad apk"));

    await runAndroid(config, { platform: "android" } as never, []);

    expect(mockLogger.fail).toHaveBeenCalledWith("bad apk");
    expect(process.exitCode).toBe(1);
  });

  it("fails when no device is available", async () => {
    process.exitCode = 0;
    mockBuildAndroid.mockResolvedValueOnce("/repo/android");
    mockTools.findOutputFile.mockReturnValueOnce(["app.apk"]);
    mockTools.getPackageName.mockReturnValueOnce({
      packageName: "com.example",
      activityName: ".MainActivity",
    });
    mockTools.selectDevice.mockResolvedValueOnce(undefined);

    await runAndroid(config, { platform: "android" } as never, []);

    expect(mockLogger.fail).toHaveBeenCalledWith(
      "Failed to launch app: Could not find an appropriate device"
    );
    expect(process.exitCode).toBe(1);
  });

  it("fails when installation fails", async () => {
    process.exitCode = 0;
    mockBuildAndroid.mockResolvedValueOnce("/repo/android");
    mockTools.findOutputFile.mockReturnValueOnce(["app.apk"]);
    mockTools.getPackageName.mockReturnValueOnce({
      packageName: "com.example",
      activityName: ".MainActivity",
    });
    mockTools.selectDevice.mockResolvedValueOnce({ name: "Pixel" });
    mockTools.install.mockResolvedValueOnce(new Error("install failed"));

    await runAndroid(config, { platform: "android" } as never, []);

    expect(mockLogger.fail).toHaveBeenCalledWith("install failed");
    expect(process.exitCode).toBe(1);
    expect(mockTools.start).not.toHaveBeenCalled();
  });

  it("installs and starts the app on success, warning about multiple APKs", async () => {
    mockBuildAndroid.mockResolvedValueOnce("/repo/android");
    mockTools.findOutputFile.mockReturnValueOnce(["a/app.apk", "b/app.apk"]);
    mockTools.getPackageName.mockReturnValueOnce({
      packageName: "com.example",
      activityName: ".MainActivity",
    });
    mockTools.selectDevice.mockResolvedValueOnce({ name: "Pixel" });
    mockTools.install.mockResolvedValueOnce(undefined);
    mockTools.start.mockResolvedValueOnce(undefined);

    await runAndroid(
      config,
      { platform: "android", device: "Pixel" } as never,
      ["--extra"]
    );

    expect(mockLogger.info).toHaveBeenCalledWith(
      expect.stringContaining("Multiple APKs were found")
    );
    expect(mockTools.install).toHaveBeenCalledWith(
      { name: "Pixel" },
      "a/app.apk",
      "com.example"
    );
    expect(mockTools.start).toHaveBeenCalledWith(
      { name: "Pixel" },
      "com.example",
      ".MainActivity"
    );
    expect(mockLogger.succeed).toHaveBeenCalledWith("Started com.example");
  });
});

import type { Config } from "@react-native-community/cli-types";
import { buildAndroid } from "../../src/build/android.ts";

const mockInvalidateState = jest.fn();
jest.mock("@rnx-kit/tools-react-native/cache", () => ({
  invalidateState: () => mockInvalidateState(),
}));

const mockAssemble = jest.fn();
jest.mock("@rnx-kit/tools-android", () => ({
  assemble: (...args: unknown[]) => mockAssemble(...args),
}));

const mockWatch = jest.fn();
jest.mock("../../src/build/watcher.ts", () => ({
  watch: (...args: unknown[]) => mockWatch(...args),
}));

describe("buildAndroid", () => {
  const savedExitCode = process.exitCode;

  function makeLogger() {
    return {
      info: jest.fn(),
      start: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    };
  }

  afterEach(() => {
    jest.clearAllMocks();
    process.exitCode = savedExitCode;
  });

  it("fails when there is no Android project", async () => {
    process.exitCode = 0;
    const logger = makeLogger();
    const config = { project: {} } as Config;

    const result = await buildAndroid(config, {} as never, [], logger as never);

    expect(result).toBeNull();
    expect(mockInvalidateState).toHaveBeenCalledTimes(1);
    expect(process.exitCode).toBe(1);
    expect(logger.fail).toHaveBeenCalledWith("No Android project was found");
    expect(mockAssemble).not.toHaveBeenCalled();
  });

  it("assembles and watches the Gradle build when a project exists", async () => {
    const sourceDir = "/repo/android";
    const gradle = { spawnargs: ["gradlew"] };
    mockAssemble.mockReturnValueOnce(gradle);
    mockWatch.mockReturnValueOnce("watched");

    const logger = makeLogger();
    const config = { project: { android: { sourceDir } } } as unknown as Config;
    const buildParams = { platform: "android" } as never;
    const additionalArgs = ["--verbose"];

    const result = await buildAndroid(
      config,
      buildParams,
      additionalArgs,
      logger as never
    );

    expect(result).toBe("watched");
    expect(mockAssemble).toHaveBeenCalledWith(
      sourceDir,
      buildParams,
      additionalArgs
    );
    expect(mockWatch).toHaveBeenCalledTimes(1);
    expect(mockWatch.mock.calls[0][0]).toBe(gradle);
  });
});

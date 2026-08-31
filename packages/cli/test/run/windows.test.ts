import type { Config } from "@react-native-community/cli-types";
import { runWindows } from "../../src/run/windows.ts";

const mockBuildWindows = jest.fn();
jest.mock("../../src/build/windows.ts", () => ({
  buildWindows: (...args: unknown[]) => mockBuildWindows(...args),
}));

describe("runWindows", () => {
  const config = {} as Config;

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("builds with `launch` and `deploy` enabled", () => {
    mockBuildWindows.mockReturnValueOnce(Promise.resolve("built"));

    const params = { platform: "windows", solution: "App.sln" } as never;
    const additionalArgs = ["--logging"];
    const logger = { info: jest.fn() };

    runWindows(config, params, additionalArgs, logger as never);

    expect(mockBuildWindows).toHaveBeenCalledTimes(1);
    const [passedConfig, runParams, passedArgs, passedLogger] =
      mockBuildWindows.mock.calls[0];
    expect(passedConfig).toBe(config);
    expect(runParams).toMatchObject({
      platform: "windows",
      solution: "App.sln",
      launch: true,
      deploy: true,
    });
    expect(passedArgs).toBe(additionalArgs);
    expect(passedLogger).toBe(logger);
  });
});

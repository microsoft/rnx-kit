import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { emitBytecode } from "../../src/bundle/hermes.ts";

const mockSpawnSync = jest.fn(() => ({ status: 0 }));
jest.mock("node:child_process", () => ({
  spawnSync: (...args: unknown[]) => mockSpawnSync(...args),
}));

const mockExistsSync = jest.fn(() => true);
const mockReadFileSync = jest.fn(() => "{}");
jest.mock("node:fs", () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
  readFileSync: (...args: unknown[]) => mockReadFileSync(...args),
}));

jest.mock("node:os", () => ({
  platform: () => "linux",
}));

const mockError = jest.fn();
const mockInfo = jest.fn();
jest.mock("@rnx-kit/console", () => ({
  error: (...args: unknown[]) => mockError(...args),
  info: (...args: unknown[]) => mockInfo(...args),
}));

const mockWriteJSONFileSync = jest.fn();
jest.mock("@rnx-kit/tools-filesystem", () => ({
  writeJSONFileSync: (...args: unknown[]) => mockWriteJSONFileSync(...args),
}));

const mockFindPackageDependencyDir = jest.fn();
jest.mock("@rnx-kit/tools-node/package", () => ({
  findPackageDependencyDir: (...args: unknown[]) =>
    mockFindPackageDependencyDir(...args),
}));

const mockComposeSourceMaps = jest.fn(() => ({ composed: true }));
jest.mock("@rnx-kit/tools-react-native/metro", () => ({
  requireModuleFromMetro: () => ({
    composeSourceMaps: (...args: unknown[]) => mockComposeSourceMaps(...args),
  }),
}));

describe("emitBytecode()", () => {
  const config = {
    reactNativePath: "/repo/node_modules/react-native",
  } as CLIConfig;

  const savedExitCode = process.exitCode;

  beforeEach(() => {
    mockSpawnSync.mockImplementation(() => ({ status: 0 }));
    mockExistsSync.mockImplementation(() => true);
    mockFindPackageDependencyDir.mockReturnValue(undefined);
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.exitCode = savedExitCode;
  });

  it("logs an error when no Hermes compiler is found", () => {
    mockExistsSync.mockImplementation(() => false);
    mockFindPackageDependencyDir.mockReturnValue(undefined);

    emitBytecode(config, "main.jsbundle", undefined, {});

    expect(mockError).toHaveBeenCalledWith("No Hermes compiler was found");
    expect(mockSpawnSync).not.toHaveBeenCalled();
  });

  it("invokes the provided Hermes command with default flags and output", () => {
    emitBytecode(config, "main.jsbundle", undefined, { command: "hermesc" });

    expect(mockSpawnSync).toHaveBeenCalledTimes(1);

    const [cmd, args] = mockSpawnSync.mock.calls[0];

    expect(cmd).toBe("hermesc");
    expect(args).toEqual([
      "-emit-binary",
      "-max-diagnostic-width=80",
      "-O",
      "-output-source-map",
      "-w",
      "-out",
      "main.jsbundle.hbc",
      "main.jsbundle",
    ]);
    expect(mockInfo).toHaveBeenCalledWith(
      "Emitting bytecode to:",
      "main.jsbundle.hbc"
    );
  });

  it("honors a custom `-out` flag and custom flags", () => {
    emitBytecode(config, "main.jsbundle", undefined, {
      command: "hermesc",
      flags: ["-O", "-out=custom.hbc"],
    });

    const [, args] = mockSpawnSync.mock.calls[0];

    expect(args).toEqual([
      "-emit-binary",
      "-max-diagnostic-width=80",
      "-O",
      "-out=custom.hbc",
      "main.jsbundle",
    ]);
  });

  it("throws when the Hermes compiler fails", () => {
    const error = new Error("hermes crashed");
    mockSpawnSync.mockImplementation(() => ({ status: 1, error }));

    expect(() =>
      emitBytecode(config, "main.jsbundle", undefined, { command: "hermesc" })
    ).toThrow(error);
  });

  it("composes source maps when a sourcemap is provided", () => {
    emitBytecode(config, "main.jsbundle", "main.jsbundle.map", {
      command: "hermesc",
    });

    expect(mockReadFileSync).toHaveBeenCalledWith(
      "main.jsbundle.map",
      expect.anything()
    );
    expect(mockComposeSourceMaps).toHaveBeenCalledTimes(1);
    expect(mockWriteJSONFileSync).toHaveBeenCalledWith(
      "main.jsbundle.hbc.map",
      { composed: true },
      0
    );
  });

  it("discovers the Hermes binary from the react-native SDK", () => {
    // The first location (react-native/sdks/hermesc) exists.
    mockExistsSync.mockImplementation(() => true);

    emitBytecode(config, "main.jsbundle", undefined, {});

    expect(mockSpawnSync).toHaveBeenCalledTimes(1);

    const [cmd] = mockSpawnSync.mock.calls[0];

    expect(String(cmd)).toContain("hermesc");
  });
});

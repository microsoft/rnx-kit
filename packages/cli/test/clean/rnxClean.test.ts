import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { EventEmitter } from "node:events";
import { rnxClean } from "../../src/clean.ts";

type SpawnResult =
  | { type: "close"; code: number | null }
  | { type: "error"; error: Error };

let mockSpawnResult: SpawnResult = { type: "close", code: 0 };
const mockSpawn = jest.fn(() => {
  const proc = new EventEmitter();
  const result = mockSpawnResult;
  process.nextTick(() => {
    if (result.type === "error") {
      proc.emit("error", result.error);
    } else {
      proc.emit("close", result.code);
    }
  });
  return proc;
});
jest.mock("node:child_process", () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}));

const mockExistsSync = jest.fn(() => true);
jest.mock("node:fs", () => ({
  existsSync: (...args: unknown[]) => mockExistsSync(...args),
}));

const mockRm = jest.fn(() => Promise.resolve());
jest.mock("node:fs/promises", () => ({
  rm: (...args: unknown[]) => mockRm(...args),
  // eslint-disable-next-line require-yield
  glob: async function* () {
    // No matching files.
  },
}));

jest.mock("node:os", () => ({
  platform: () => "linux",
  tmpdir: () => "/tmp",
  homedir: () => "/home/user",
}));

const mockSpinner = {
  start: jest.fn(() => mockSpinner),
  succeed: jest.fn(() => mockSpinner),
  fail: jest.fn(() => mockSpinner),
  warn: jest.fn(() => mockSpinner),
};
jest.mock("ora", () => ({
  __esModule: true,
  default: () => mockSpinner,
}));

describe("clean/rnxClean()", () => {
  const config = { root: "/repo" } as CLIConfig;
  const savedExitCode = process.exitCode;

  function flush() {
    return new Promise((resolve) => setImmediate(resolve));
  }

  beforeEach(() => {
    mockSpawnResult = { type: "close", code: 0 };
    mockExistsSync.mockImplementation(() => true);
  });

  afterEach(() => {
    jest.clearAllMocks();
    process.exitCode = savedExitCode;
  });

  it("throws when the project root does not exist", async () => {
    mockExistsSync.mockImplementation(() => false);

    await expect(rnxClean([], config, {})).rejects.toThrow(
      "Invalid project root: /repo"
    );
  });

  it("warns and stops on an unknown category", async () => {
    await rnxClean([], config, { include: "bogus" });

    expect(mockSpinner.warn).toHaveBeenCalledWith("Unknown category: bogus");
    expect(mockSpinner.succeed).not.toHaveBeenCalled();
  });

  it("cleans the Metro caches by default", async () => {
    // `metro` and `watchman` are the default categories.
    await rnxClean([], config, {});

    // Metro cache directories are removed via `fs.rm`.
    expect(mockRm).toHaveBeenCalled();
    // Watchman is stopped/cleared via spawned processes.
    expect(mockSpawn).toHaveBeenCalledWith(
      "killall",
      ["watchman"],
      expect.objectContaining({ cwd: "/repo" })
    );
    expect(mockSpawn).toHaveBeenCalledWith(
      "watchman",
      ["watch-del-all"],
      expect.anything()
    );
    expect(mockSpinner.succeed).toHaveBeenCalled();
  });

  it("runs the CocoaPods cleaner", async () => {
    await rnxClean([], config, { include: "cocoapods" });

    expect(mockSpawn).toHaveBeenCalledWith(
      "pod",
      ["cache", "clean", "--all"],
      expect.anything()
    );
    expect(mockSpinner.succeed).toHaveBeenCalledTimes(1);
  });

  it("verifies the npm cache only when requested", async () => {
    await rnxClean([], config, { include: "npm" });
    expect(mockSpawn).not.toHaveBeenCalledWith(
      "npm",
      ["cache", "verify"],
      expect.anything()
    );

    jest.clearAllMocks();

    await rnxClean([], config, { include: "npm", verifyCache: true });
    expect(mockSpawn).toHaveBeenCalledWith(
      "npm",
      ["cache", "verify"],
      expect.anything()
    );
  });

  it("reports a failure when a command cannot be found", async () => {
    mockSpawnResult = {
      type: "error",
      error: Object.assign(new Error("nope"), { code: "ENOENT" }),
    };

    await rnxClean([], config, { include: "yarn" });

    expect(mockSpinner.fail).toHaveBeenCalledWith(
      expect.stringContaining("Unknown command: yarn")
    );
  });

  it("ignores errors for commands with an error handler", async () => {
    // Watchman's `killall` uses an `onError` handler, so a non-zero exit code
    // should still resolve rather than reject.
    mockSpawnResult = { type: "close", code: 1 };

    await rnxClean([], config, { include: "watchman" });
    await flush();

    // The subsequent command (`watch-del-all`) has no error handler, so the
    // non-zero exit code is reported as a failure.
    expect(mockSpinner.fail).toHaveBeenCalled();
  });
});

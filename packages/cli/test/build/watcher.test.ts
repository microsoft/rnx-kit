import type { ChildProcessWithoutNullStreams } from "node:child_process";
import { EventEmitter } from "node:events";
import type { Logger } from "../../src/build/watcher.ts";
import { watch } from "../../src/build/watcher.ts";

type FakeSubprocess = EventEmitter & {
  stdout: EventEmitter;
  stderr: EventEmitter;
  spawnargs: string[];
};

describe("watch", () => {
  const savedExitCode = process.exitCode;
  const savedCI = process.env.CI;

  function runFakeBuild(spawnargs = ["gradlew", "clean"]) {
    const proc = new EventEmitter() as FakeSubprocess;
    proc.stdout = new EventEmitter();
    proc.stderr = new EventEmitter();
    proc.spawnargs = spawnargs;
    return proc as unknown as FakeSubprocess & ChildProcessWithoutNullStreams;
  }

  function makeLogger() {
    return {
      text: "",
      info: jest.fn(),
      start: jest.fn(),
      stop: jest.fn(),
      succeed: jest.fn(),
      fail: jest.fn(),
    } as unknown as Logger;
  }

  afterEach(() => {
    process.exitCode = savedExitCode;
    if (savedCI == null) {
      delete process.env.CI;
    } else {
      process.env.CI = savedCI;
    }
  });

  it("calls `onSuccess` when the build succeeds", async () => {
    delete process.env.CI;

    const build = runFakeBuild();
    const logger = makeLogger();
    const onSuccess = jest.fn(() => "success-value");

    const promise = watch(build, logger, false, onSuccess);

    // Non-CI mode updates the spinner text on stdout data.
    build.stdout.emit("data", Buffer.from("compiling"));
    build.emit("close", 0);

    await expect(promise).resolves.toBe("success-value");
    expect(logger.info).toHaveBeenCalledWith("Command: gradlew clean");
    expect(logger.start).toHaveBeenCalledWith("Building");
    expect(logger.succeed).toHaveBeenCalledWith("Build succeeded");
    expect(onSuccess).toHaveBeenCalledTimes(1);
  });

  it("fails and sets the exit code when the build fails", async () => {
    delete process.env.CI;
    process.exitCode = 0;

    const build = runFakeBuild();
    const logger = makeLogger();
    const onSuccess = jest.fn();

    const promise = watch(build, logger, false, onSuccess);

    build.stderr.emit("data", Buffer.from("error: "));
    build.stderr.emit("data", Buffer.from("boom"));
    build.emit("close", 2);

    await expect(promise).resolves.toBe(2);
    expect(logger.fail).toHaveBeenCalledWith("error: boom");
    expect(onSuccess).not.toHaveBeenCalled();
    expect(process.exitCode).toBe(2);
  });

  it("defaults to exit code 1 when none is provided", async () => {
    delete process.env.CI;
    process.exitCode = 0;

    const build = runFakeBuild();
    const logger = makeLogger();

    const promise = watch(build, logger, false, jest.fn());

    build.emit("close", null);

    await expect(promise).resolves.toBeNull();
    expect(process.exitCode).toBe(1);
  });

  it("pipes output to the parent process in CI", async () => {
    process.env.CI = "1";

    const build = runFakeBuild();
    const logger = makeLogger();

    const stdoutWrite = jest
      .spyOn(process.stdout, "write")
      .mockImplementation(() => true);
    const stderrWrite = jest
      .spyOn(process.stderr, "write")
      .mockImplementation(() => true);

    try {
      const promise = watch(
        build,
        logger,
        true,
        jest.fn(() => "ok")
      );

      const out = Buffer.from("stdout chunk");
      const err = Buffer.from("stderr chunk");
      build.stdout.emit("data", out);
      build.stderr.emit("data", err);
      build.emit("close", 0);

      await expect(promise).resolves.toBe("ok");
      expect(stdoutWrite).toHaveBeenCalledWith(out);
      expect(stderrWrite).toHaveBeenCalledWith(err);
    } finally {
      stdoutWrite.mockRestore();
      stderrWrite.mockRestore();
    }
  });
});

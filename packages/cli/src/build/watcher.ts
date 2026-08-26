import type { ChildProcessWithoutNullStreams } from "node:child_process";

export type ExitCode = number | null;

export type Logger = {
  text: string;
  fail(text?: string): void;
  info(text?: string): void;
  start(text?: string): void;
  stop(text?: string): void;
  succeed(text?: string): void;
};

export function watch<T>(
  subproc: ChildProcessWithoutNullStreams,
  logger: Logger,
  verbose = Boolean(process.env.CI),
  onSuccess: () => T
) {
  return new Promise<T | ExitCode>((resolve) => {
    const step = "Building";
    const errors: Buffer[] = [];

    if (verbose) {
      subproc.stdout.on("data", (chunk) => {
        logger.stop();
        process.stdout.write(chunk);
      });
      subproc.stderr.on("data", (chunk) => {
        logger.stop();
        process.stderr.write(chunk);
      });
    } else {
      let i = 0;
      subproc.stdout.on("data", () => {
        logger.text = step + ".".repeat(++i % 6);
      });
      subproc.stderr.on("data", (data) => errors.push(data));
    }

    subproc.on("close", (code) => {
      if (code === 0) {
        logger.succeed("Build succeeded");
        resolve(onSuccess());
      } else {
        logger.fail(Buffer.concat(errors).toString().trim());
        process.exitCode = code ?? 1;
        resolve(code);
      }
    });

    logger.info(`Command: ${subproc.spawnargs.join(" ")}`);
    logger.start(step);
  });
}

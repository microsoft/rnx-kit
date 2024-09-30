import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { Ora } from "ora";

export type ExitCode = number | null;

export function watch<T>(
  subproc: ChildProcessWithoutNullStreams,
  logger: Ora,
  onSuccess: () => T
) {
  return new Promise<T | ExitCode>((resolve) => {
    const errors: Buffer[] = [];

    const isCI = Boolean(process.env.CI);
    if (isCI) {
      subproc.stdout.on("data", (chunk) => process.stdout.write(chunk));
      subproc.stderr.on("data", (chunk) => process.stderr.write(chunk));
    } else {
      subproc.stdout.on("data", () => (logger.text += "."));
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
    logger.start("Building");
  });
}

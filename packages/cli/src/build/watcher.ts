import type { ChildProcessWithoutNullStreams } from "node:child_process";
import type { Ora } from "ora";

export function watch(
  subproc: ChildProcessWithoutNullStreams,
  logger: Ora,
  onSuccess: () => void,
  onFail: (exitCode: number | null) => void
) {
  subproc.stdout.on("data", () => (logger.text += "."));

  const errors: Buffer[] = [];
  subproc.stderr.on("data", (data) => errors.push(data));

  subproc.on("close", (code) => {
    if (code === 0) {
      logger.succeed("Build succeeded");
      onSuccess();
    } else {
      logger.fail(Buffer.concat(errors).toString());
      process.exitCode = code ?? 1;
      onFail(code);
    }
  });

  logger.info(`Command: ${subproc.spawnargs.join(" ")}`);
  logger.start("Building");
}

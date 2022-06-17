import type { SpawnSyncReturns } from "node:child_process";
import { spawn, spawnSync } from "node:child_process";

type SpawnResult = Pick<
  SpawnSyncReturns<string>,
  "stdout" | "stderr" | "status"
>;

type Command = (...args: string[]) => Promise<SpawnResult>;
type CommandSync = (...args: string[]) => SpawnResult;

export function ensure(result: SpawnResult, message = result.stderr): string {
  if (result.status !== 0) {
    throw new Error(message);
  }
  return result.stdout;
}

export function makeCommand(command: string): Command {
  return (...args: string[]) => {
    return new Promise((resolve) => {
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      const cmd = spawn(command, args);

      cmd.stdout.on("data", (data) => {
        stdout.push(data);
      });

      cmd.stderr.on("data", (data) => {
        stderr.push(data);
      });

      cmd.on("close", (status) => {
        resolve({
          stdout: Buffer.concat(stdout).toString().trim(),
          stderr: Buffer.concat(stderr).toString().trim(),
          status,
        });
      });
    });
  };
}

export function makeCommandSync(command: string): CommandSync {
  return (...args: string[]) => spawnSync(command, args, { encoding: "utf-8" });
}

import type { SpawnSyncReturns } from "node:child_process";
import { spawn, spawnSync } from "node:child_process";
import * as readline from "node:readline";

type SpawnResult = Pick<
  SpawnSyncReturns<string>,
  "stdout" | "stderr" | "status"
>;

type Command = (...args: string[]) => Promise<SpawnResult>;
type CommandSync = (...args: string[]) => SpawnResult;

function isNoSuchFileOrDirectory(err: unknown): boolean {
  return err instanceof Error && "code" in err && err["code"] === "ENOENT";
}

export function ensure(result: SpawnResult, message = result.stderr): string {
  if (result.status !== 0) {
    throw new Error(message);
  }
  return result.stdout;
}

export async function ensureInstalled(
  check: () => Promise<unknown>,
  message: string
): Promise<void> {
  try {
    await check();
    return;
  } catch (e) {
    if (!isNoSuchFileOrDirectory(e)) {
      throw e;
    }
  }

  const prompt = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  while (prompt) {
    await new Promise((resolve) => prompt.question(message, resolve));
    try {
      await check();
      break;
    } catch (e) {
      if (!isNoSuchFileOrDirectory(e)) {
        throw e;
      }
    }
  }
  prompt.close();
}

export function makeCommand(command: string, options = {}): Command {
  return (...args: string[]) => {
    return new Promise((resolve, reject) => {
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];

      const cmd = spawn(command, args, options);

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

      cmd.on("error", reject);
    });
  };
}

export function makeCommandSync(command: string): CommandSync {
  return (...args: string[]) => spawnSync(command, args, { encoding: "utf-8" });
}

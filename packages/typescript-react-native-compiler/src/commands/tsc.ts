import child_process from "child_process";

export function tsc(...args: string[]): void {
  child_process.spawnSync(
    process.execPath,
    [require.resolve("typescript/lib/tsc"), ...args],
    {
      stdio: "inherit",
    }
  );
}

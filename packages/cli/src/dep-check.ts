import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { Args, cli } from "@rnx-kit/dep-check";

// TypeScript loses the type of `key` when return type is `T`.
// eslint-disable-next-line @typescript-eslint/ban-types
function pickValue<T>(key: keyof T, obj: T): {} | undefined {
  return typeof obj[key] !== "undefined" ? { [key]: obj[key] } : undefined;
}

export function rnxDepCheck(
  argv: string[],
  _config: CLIConfig,
  args: Args
): void {
  cli({
    ...pickValue("custom-profiles", args),
    ...pickValue("exclude-packages", args),
    ...pickValue("init", args),
    ...pickValue("vigilant", args),
    write: Boolean(args.write),
    "package-json": argv[0],
  });
}

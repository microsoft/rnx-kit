import type { Config as CLIConfig } from "@react-native-community/cli-types";
import { Args, cli } from "@rnx-kit/dep-check";
import _ from "lodash";

export function rnxDepCheck(
  argv: string[],
  _config: CLIConfig,
  args: Args
): void {
  cli({
    ..._.pick(args, "custom-profiles", "exclude-packages", "init", "vigilant"),
    write: Boolean(args.write),
    "package-json": argv[0],
  });
}

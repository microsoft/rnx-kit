import { Args, cli } from "@rnx-kit/dep-check";

export function rnxDepCheck(
  argv: Array<string>,
  _config: Object /*: ConfigT*/,
  { init, write }: Args
): void {
  cli({ init, write: Boolean(write), "package-json": argv[0] });
}

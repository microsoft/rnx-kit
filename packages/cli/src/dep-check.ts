import { Args, cli } from "@rnx-kit/dep-check";

export function rnxDepCheck(
  argv: Array<string>,
  _config: Object /*: ConfigT*/,
  { write }: Args
): void {
  cli({ write: Boolean(write), "package-json": argv[0] });
}

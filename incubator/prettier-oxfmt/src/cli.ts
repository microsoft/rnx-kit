#!/usr/bin/env node
import { spawnSync } from "node:child_process";
import { translate } from "./translate.ts";

/**
 * Locate the real `oxfmt` executable. In a real implementation this would
 * resolve the `oxfmt` binary from `node_modules`; for this mock-up we defer to
 * whatever is on `PATH`.
 */
function oxfmtBin(): string {
  return process.env.OXFMT_BIN ?? "oxfmt";
}

/**
 * Handle the Prettier-only flags that oxfmt does not expose on its CLI. These
 * are stubbed here to document the intended behaviour; a real implementation
 * would query oxfmt's config resolution and ignore rules.
 */
function handleShimFlag(flag: string, value: string | undefined): number {
  switch (flag) {
    case "support-info":
      // Prettier prints a JSON blob describing supported languages/options.
      process.stdout.write(
        JSON.stringify(
          { languages: [], options: [], note: "mock-up: not implemented" },
          null,
          2
        ) + "\n"
      );
      return 0;

    case "file-info":
      // Prettier prints `{ ignored, inferredParser }` for the given path.
      process.stdout.write(
        JSON.stringify({ ignored: false, inferredParser: null }) + "\n"
      );
      return value ? 0 : 1;

    case "find-config-path":
      // Prettier prints the config file governing the given path, if any.
      process.stderr.write("mock-up: --find-config-path not implemented\n");
      return 1;

    default:
      process.stderr.write(`mock-up: unhandled shim flag --${flag}\n`);
      return 1;
  }
}

export function run(argv: string[] = process.argv.slice(2)): number {
  const result = translate(argv);

  switch (result.type) {
    case "error":
      process.stderr.write(`[prettier-oxfmt] ${result.message}\n`);
      return 2;

    case "shim":
      return handleShimFlag(result.flag, result.value);

    case "forward": {
      const child = spawnSync(oxfmtBin(), result.args, { stdio: "inherit" });
      if (child.error) {
        process.stderr.write(
          `[prettier-oxfmt] failed to launch oxfmt: ${child.error.message}\n`
        );
        return 1;
      }
      return child.status ?? 1;
    }
  }
}

// Only auto-run when invoked as a binary, not when imported by tests.
if (process.argv[1] && process.argv[1].endsWith("cli.js")) {
  process.exit(run());
}

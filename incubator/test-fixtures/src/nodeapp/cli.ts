/**
 * Command-line entry. Reads JSON from stdin or `--input <file>`, runs the
 * pipeline, and prints the result as JSON to stdout.
 *
 * Usage:
 *   node lib/nodeapp/cli.js                       # stdin
 *   node lib/nodeapp/cli.js --input data.json     # file
 *   node lib/nodeapp/cli.js --sample small        # built-in named sample
 *   node lib/nodeapp/cli.js --sample small --pretty
 *
 * Source-mode (requires Node 22.6+):
 *   node --experimental-strip-types src/nodeapp/cli.ts ...
 */

import * as fs from "node:fs/promises";
import process from "node:process";
import { getSample, sampleNames, samples } from "./data/samples.ts";
import { execute, runWithResolved } from "./pipeline.ts";
import { parseStrict } from "./stages/parse-strict.mts";

// Re-export the public API so consumers can bundle the TS source directly
// via `@rnx-kit/test-fixtures/nodeapp/cli` without separately importing
// from the lib output of `@rnx-kit/test-fixtures/nodeapp`.
export {
  execute as runAppFromUnknown,
  getSample,
  parseStrict,
  runWithResolved as runApp,
  sampleNames,
  samples,
};
export type {
  AppInput,
  AppOutput,
  AppRecord,
  GroupSummary,
  Options,
  ResolvedOptions,
  Sample,
  StddevMode,
  Summary,
  Tag,
  TagCount,
  Window,
} from "./types.ts";

type Args = {
  input?: string;
  sample?: string;
  pretty: boolean;
  help: boolean;
};

function parseArgs(argv: readonly string[]): Args {
  const out: Args = { pretty: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    switch (a) {
      case "--input":
        out.input = argv[++i];
        break;
      case "--sample":
        out.sample = argv[++i];
        break;
      case "--pretty":
        out.pretty = true;
        break;
      case "-h":
      case "--help":
        out.help = true;
        break;
      default:
        throw new Error(`Unknown argument: ${a}`);
    }
  }
  return out;
}

function usage(): string {
  return [
    "Usage: cli [--input <path>] [--sample <name>] [--pretty]",
    "",
    "  --input <path>   read JSON input from a file",
    "  --sample <name>  run a named built-in sample",
    "  --pretty         pretty-print JSON output (2-space indent)",
    "  -h, --help       show this message",
    "",
    "If neither --input nor --sample is given, JSON is read from stdin.",
  ].join("\n");
}

async function readStdin(): Promise<string> {
  let data = "";
  process.stdin.setEncoding("utf8");
  for await (const chunk of process.stdin) {
    data += chunk;
  }
  return data;
}

async function loadInput(args: Args): Promise<unknown> {
  if (args.sample !== undefined) {
    const sample = getSample(args.sample);
    if (!sample) {
      throw new Error(`Unknown sample: ${args.sample}`);
    }
    return sample.input;
  }
  const raw =
    args.input !== undefined
      ? await fs.readFile(args.input, "utf8")
      : await readStdin();
  return JSON.parse(raw);
}

export async function main(argv: readonly string[]): Promise<number> {
  let args: Args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    process.stderr.write(`${(e as Error).message}\n\n${usage()}\n`);
    return 2;
  }
  if (args.help) {
    process.stdout.write(`${usage()}\n`);
    return 0;
  }
  try {
    const input = await loadInput(args);
    const output = await execute(input);
    const json = args.pretty
      ? JSON.stringify(output, null, 2)
      : JSON.stringify(output);
    process.stdout.write(`${json}\n`);
    return 0;
  } catch (e) {
    process.stderr.write(`error: ${(e as Error).message}\n`);
    return 1;
  }
}

// Run only when executed as a script. `import.meta.url` is the source file's
// URL; `process.argv[1]` is the entry script. Compare via URL form.
const entryUrl = process.argv[1]
  ? new URL(`file://${process.argv[1]}`).href
  : "";
if (import.meta.url === entryUrl) {
  const code = await main(process.argv.slice(2));
  process.exit(code);
}

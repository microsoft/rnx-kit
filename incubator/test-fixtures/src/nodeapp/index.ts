/**
 * Public API for the nodeapp test fixture.
 *
 * `runApp` is the deterministic entry point: same input → same output. The
 * implementation lives in `pipeline.ts`; this module re-exports it along with
 * helpful subsurfaces (samples, strict-parser) for downstream tests.
 */

import { getSample, sampleNames, samples } from "./data/samples.ts";
import { execute, runWithResolved } from "./pipeline.ts";
import { parseStrict } from "./stages/parse-strict.mts";
import type { AppInput, AppOutput } from "./types.ts";

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

export const version = "0.0.1" as const;

export async function runApp(input: AppInput): Promise<AppOutput> {
  return await runWithResolved(input);
}

export async function runAppFromUnknown(input: unknown): Promise<AppOutput> {
  return await execute(input);
}

export { parseStrict, getSample, sampleNames, samples };

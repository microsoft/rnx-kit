/**
 * Pipeline orchestrator. Composes stages and dynamically imports the CJS
 * aggregator from this ESM module.
 */

import { resolveOptions } from "./config.ts";
import { PipelineError } from "./errors.cjs";
import { Normalizer } from "./stages/normalize.ts";
import { parse } from "./stages/parse.ts";
import { computeSummary } from "./stages/stats.ts";
import { tagFrequencies } from "./stages/tags.ts";
import { topK } from "./stages/topk.ts";
import { Transformer } from "./stages/transform.ts";
import { windowedAverages } from "./stages/windowing.ts";
import type {
  AppInput,
  AppOutput,
  AppRecord,
  GroupSummary,
  Summary,
} from "./types.ts";
import { roundTo } from "./util/format.cjs";

export async function execute(input: unknown): Promise<AppOutput> {
  const parsed = parse(input);
  return await runResolved(parsed);
}

export async function runWithResolved(input: AppInput): Promise<AppOutput> {
  return await runResolved(input);
}

async function runResolved(input: AppInput): Promise<AppOutput> {
  const options = resolveOptions(input.options);

  const normalizer = new Normalizer();
  const normalized = normalizer.normalizeAll(input.records);
  const transformer = new Transformer(normalized);
  const sorted = transformer.sortedByTs();

  // Dynamic ESM-to-CJS import — exercises the bundler's CJS interop path.
  const aggregateModule = await import("./stages/aggregate.cjs");
  const aggregate: (
    records: readonly AppRecord[]
  ) => Record<string, GroupSummary> = aggregateModule.aggregateGroups;

  const [summary, groups, tagCounts, windows] = await Promise.all([
    Promise.resolve(computeSummary(transformer.values(), options.stddevMode)),
    Promise.resolve(aggregate(sorted)),
    Promise.resolve(tagFrequencies(sorted)),
    Promise.resolve(windowedAverages(sorted, options.windowSize)),
  ]);

  if (typeof summary.mean !== "number") {
    throw new PipelineError("stats", "summary.mean is not a number");
  }

  return {
    summary: roundSummary(summary),
    groups: roundGroups(groups),
    topTags: topK(tagCounts, options.topK),
    windows: windows.map((w) => ({
      start: w.start,
      end: w.end,
      avg: roundTo(w.avg),
    })),
  };
}

function roundSummary(s: Summary): Summary {
  return {
    count: s.count,
    sum: roundTo(s.sum),
    mean: roundTo(s.mean),
    median: roundTo(s.median),
    min: roundTo(s.min),
    max: roundTo(s.max),
    stddev: roundTo(s.stddev),
  };
}

function roundGroups(
  groups: Record<string, GroupSummary>
): Record<string, GroupSummary> {
  const out: Record<string, GroupSummary> = {};
  for (const key of Object.keys(groups).sort()) {
    const g = groups[key]!;
    out[key] = { count: g.count, sum: roundTo(g.sum), mean: roundTo(g.mean) };
  }
  return out;
}

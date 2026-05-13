/**
 * Scenario definitions for the benchmark harness.
 *
 * - `warm`: in-process, repeats the corpus N iterations and reports from
 *   iteration 2 onward (iteration 1 is treated as warm-up to defeat JIT
 *   tier-up effects and lazy-init costs).
 * - `cold-start`: forks a worker per transformer, sends one file, measures
 *   first-call latency. Captures `require("@swc/core")`, `require("hermes-parser")`,
 *   and `lazyInit` cost — the things that matter for `metro --reset-cache` runs.
 * - `bundle`: macro scenario implemented separately in bench/bundle.ts and
 *   bench/bundle-esbuild.ts; wired into run.ts via --scenario bundle.
 */

export type ScenarioName = "warm" | "cold" | "cold-start" | "bundle" | "all";

export type Scenario = {
  name: "warm" | "cold-start" | "bundle";
  description: string;
};

export const SCENARIOS: Record<Scenario["name"], Scenario> = {
  warm: {
    name: "warm",
    description:
      "In-process, 5 iterations over the corpus; reports iterations 2..N.",
  },
  "cold-start": {
    name: "cold-start",
    description:
      "child_process.fork per transformer; measures first-call latency including module load.",
  },
  bundle: {
    name: "bundle",
    description:
      "Runs the real Metro bundle smoke tests (bundle.ts + bundle-esbuild.ts).",
  },
};

/**
 * Default iteration count for the warm scenario. Iteration 0 is the warm-up
 * and is discarded; iterations 1..N-1 are aggregated.
 */
export const DEFAULT_WARM_ITERATIONS = 5;

/**
 * Default corpus-replication factor. The harness loads
 * test/__fixtures__/*.{ts,tsx,js,jsx} and replicates them this many times to
 * get a measurement large enough that per-call noise averages out.
 */
export const DEFAULT_CORPUS_REPLICATION = 5;

export function resolveScenarios(input: ScenarioName): Scenario["name"][] {
  if (input === "all") return ["warm", "cold-start"];
  if (input === "cold") return ["cold-start"];
  return [input];
}

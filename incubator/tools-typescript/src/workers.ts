import type { Target } from "@lage-run/target-graph";

export type Worker = (target: Target) => Promise<void>;

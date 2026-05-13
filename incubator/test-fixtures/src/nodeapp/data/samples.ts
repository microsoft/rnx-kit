/**
 * Named sample bundles: input + expected output. The expected outputs come
 * from `golden.ts`; the inputs from `inputs.ts`.
 */

import type { Sample } from "../types.ts";
import { goldens } from "./golden.ts";
import { inputs } from "./inputs.ts";

export type SampleName = "empty" | "tiny" | "small" | "large";

export const samples: readonly Sample[] = [
  { name: "empty", input: inputs.empty, expected: goldens.empty },
  { name: "tiny", input: inputs.tiny, expected: goldens.tiny },
  { name: "small", input: inputs.small, expected: goldens.small },
  { name: "large", input: inputs.large, expected: goldens.large },
];

const byName = new Map<string, Sample>(samples.map((s) => [s.name, s]));

export function getSample(name: string): Sample | undefined {
  return byName.get(name);
}

export const sampleNames: readonly SampleName[] = [
  "empty",
  "tiny",
  "small",
  "large",
];

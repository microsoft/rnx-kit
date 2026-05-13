/**
 * Named raw inputs for the test fixture. Inputs only — paired with expected
 * outputs in `golden.ts` and surfaced via `samples.ts`.
 */

import type { AppInput, AppRecord } from "../types.ts";
import { generateRecords } from "./generators.ts";

const empty: AppInput = { records: [] };

const tinyRecords: readonly AppRecord[] = [
  { id: "a", group: "x", value: 1, ts: 1, tags: ["foo"] },
  { id: "b", group: "x", value: 2, ts: 2, tags: ["foo", "bar"] },
  { id: "c", group: "y", value: 3, ts: 3 },
];
const tiny: AppInput = { records: tinyRecords };

const smallRecords: readonly AppRecord[] = [
  { id: "r01", group: "Red", value: 10.5, ts: 100, tags: ["alpha"] },
  { id: "r02", group: "red", value: 12.25, ts: 105, tags: ["alpha", "beta"] },
  { id: "r03", group: "Blue", value: 8.75, ts: 110, tags: ["beta"] },
  { id: "r04", group: "green", value: 15, ts: 115, tags: ["gamma", "alpha"] },
  { id: "r05", group: "RED", value: 9.5, ts: 120 },
  { id: "r06", group: "blue", value: 11, ts: 125, tags: ["alpha"] },
  { id: "r07", group: "green", value: 14.25, ts: 130, tags: ["beta", "alpha"] },
  { id: "r08", group: "red", value: 7.75, ts: 135, tags: ["delta"] },
  { id: "r09", group: "blue", value: 13.5, ts: 140, tags: ["alpha", "gamma"] },
  { id: "r10", group: "Green", value: 10, ts: 145, tags: ["alpha"] },
];
const small: AppInput = {
  records: smallRecords,
  options: { windowSize: 3, topK: 4 },
};

const large: AppInput = {
  records: generateRecords(42, 500),
  options: { windowSize: 8, topK: 10, stddevMode: "sample" },
};

export const inputs = { empty, tiny, small, large } as const;
export type InputName = keyof typeof inputs;

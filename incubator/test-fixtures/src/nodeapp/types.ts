/**
 * Shared types for the nodeapp test fixture.
 *
 * Files named `types.ts` are subject to the `@rnx-kit/type-definitions-only`
 * ESLint rule — only type exports are permitted here.
 */

export type Tag = string;

export type AppRecord = {
  readonly id: string;
  readonly group: string;
  readonly value: number;
  readonly tags?: readonly Tag[];
  readonly ts: number;
};

export type StddevMode = "population" | "sample";

export type Options = {
  readonly windowSize?: number;
  readonly topK?: number;
  readonly stddevMode?: StddevMode;
};

export type AppInput = {
  readonly records: readonly AppRecord[];
  readonly options?: Options;
};

export type ResolvedOptions = {
  readonly windowSize: number;
  readonly topK: number;
  readonly stddevMode: StddevMode;
};

export type Summary = {
  readonly count: number;
  readonly sum: number;
  readonly mean: number;
  readonly median: number;
  readonly min: number;
  readonly max: number;
  readonly stddev: number;
};

export type GroupSummary = {
  readonly count: number;
  readonly sum: number;
  readonly mean: number;
};

export type TagCount = {
  readonly tag: Tag;
  readonly count: number;
};

export type Window = {
  readonly start: number;
  readonly end: number;
  readonly avg: number;
};

export type AppOutput = {
  readonly summary: Summary;
  readonly groups: Readonly<Record<string, GroupSummary>>;
  readonly topTags: readonly TagCount[];
  readonly windows: readonly Window[];
};

export type Sample = {
  readonly name: string;
  readonly input: AppInput;
  readonly expected: AppOutput;
};

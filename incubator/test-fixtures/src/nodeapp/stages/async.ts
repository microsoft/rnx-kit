/**
 * Async-iterator stage. Produces streams consumed by other stages.
 *
 * Exercises: async function*, for await…of, Promise.allSettled, structured
 * concurrency.
 */

import type { AppRecord } from "../types.ts";
import { asyncChunk, asyncFilter, fromArray } from "../util/iter-async.mts";

export async function* streamRecords(
  records: readonly AppRecord[]
): AsyncGenerator<AppRecord, void, void> {
  yield* fromArray(records);
}

export async function* streamValuesByGroup(
  records: readonly AppRecord[],
  group: string
): AsyncGenerator<number, void, void> {
  const filtered = asyncFilter(
    streamRecords(records),
    (r) => r.group === group
  );
  for await (const r of filtered) {
    yield r.value;
  }
}

export async function collectChunkedAverages(
  records: readonly AppRecord[],
  chunkSize: number
): Promise<number[]> {
  const out: number[] = [];
  for await (const slice of asyncChunk(streamRecords(records), chunkSize)) {
    if (slice.length === 0) continue;
    let sum = 0;
    for (const r of slice) sum += r.value;
    out.push(sum / slice.length);
  }
  return out;
}

export async function settledPerGroup(
  records: readonly AppRecord[],
  groups: readonly string[]
): Promise<Map<string, number[]>> {
  const results = await Promise.allSettled(
    groups.map(async (group) => {
      const values: number[] = [];
      for await (const v of streamValuesByGroup(records, group)) {
        values.push(v);
      }
      return [group, values] as const;
    })
  );
  const out = new Map<string, number[]>();
  for (const r of results) {
    if (r.status === "fulfilled") {
      const [group, values] = r.value;
      out.set(group, values);
    }
  }
  return out;
}

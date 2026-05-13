/**
 * Transformer — the central class that wraps the normalized record set and
 * exposes deterministic iteration, indexed access, and derived projections.
 *
 * Exercises: private fields, static blocks, accessor pairs, Symbol.iterator,
 * generic class methods.
 */

import type { AppRecord } from "../types.ts";
import { byKey, chain, stableSort } from "../util/sort.ts";

export class Transformer {
  static #instances = 0;

  static {
    // Static block — exercised at class load. Counts how many transformers
    // were created in this module (purely for diagnostics; the value is
    // exposed via the readonly `instanceId` field).
    Transformer.#instances = 0;
  }

  static get totalInstances(): number {
    return Transformer.#instances;
  }

  #records: readonly AppRecord[];
  #sortedByTs: readonly AppRecord[] | null = null;
  readonly instanceId: number;

  constructor(records: readonly AppRecord[]) {
    this.instanceId = ++Transformer.#instances;
    this.#records = records.slice();
  }

  get size(): number {
    return this.#records.length;
  }

  get records(): readonly AppRecord[] {
    return this.#records;
  }

  at(index: number): AppRecord | undefined {
    return this.#records[index];
  }

  sortedByTs(): readonly AppRecord[] {
    return (this.#sortedByTs ??= stableSort(
      this.#records,
      chain<AppRecord>(
        byKey((r) => r.ts),
        byKey((r) => r.id)
      )
    ));
  }

  values(): number[] {
    return this.#records.map((r) => r.value);
  }

  groups(): Set<string> {
    const out = new Set<string>();
    for (const r of this.#records) {
      out.add(r.group);
    }
    return out;
  }

  *[Symbol.iterator](): Generator<AppRecord, void, void> {
    for (const r of this.#records) {
      yield r;
    }
  }
}

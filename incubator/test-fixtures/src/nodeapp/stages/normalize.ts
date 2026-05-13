/**
 * Canonicalization step.
 *
 * - Lowercases & trims tags
 * - Trims ids
 * - Drops empty tag arrays
 *
 * Uses the raw ESM constants module via `.mjs` import to exercise that path.
 */

import type { AppRecord } from "../types.ts";
import { ROUND_DECIMALS } from "../util/constants.mjs";

const EMPTY_TAGS: readonly string[] = Object.freeze([]);

export class Normalizer {
  #roundDecimals: number;

  constructor(roundDecimals = ROUND_DECIMALS) {
    this.#roundDecimals = roundDecimals;
  }

  get roundDecimals(): number {
    return this.#roundDecimals;
  }

  normalize(record: AppRecord): AppRecord {
    const { id, group, value, ts, tags } = record;
    const canonicalTags =
      tags === undefined ? undefined : this.#canonicalTags(tags);
    const canonicalId = id.trim();
    const canonicalGroup = group.trim().toLowerCase();
    const canonicalValue = this.#round(value);
    return canonicalTags === undefined || canonicalTags.length === 0
      ? { id: canonicalId, group: canonicalGroup, value: canonicalValue, ts }
      : {
          id: canonicalId,
          group: canonicalGroup,
          value: canonicalValue,
          ts,
          tags: canonicalTags,
        };
  }

  normalizeAll(records: readonly AppRecord[]): AppRecord[] {
    return records.map((r) => this.normalize(r));
  }

  #canonicalTags(tags: readonly string[]): readonly string[] {
    if (tags.length === 0) return EMPTY_TAGS;
    const seen = new Set<string>();
    const out: string[] = [];
    for (const t of tags) {
      const canonical = t.trim().toLowerCase();
      if (canonical.length === 0 || seen.has(canonical)) continue;
      seen.add(canonical);
      out.push(canonical);
    }
    out.sort();
    return out;
  }

  #round(value: number): number {
    if (!Number.isFinite(value)) return value;
    const factor = Math.pow(10, this.#roundDecimals);
    return Math.round(value * factor) / factor;
  }
}

export function normalizeAll(records: readonly AppRecord[]): AppRecord[] {
  return new Normalizer().normalizeAll(records);
}

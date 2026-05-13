/**
 * Deterministic data generation. Uses Mulberry32 — a small, byte-stable PRNG
 * so the generated samples are identical across machines and Node versions.
 */

import type { AppRecord } from "../types.ts";

const TAGS = [
  "alpha",
  "beta",
  "gamma",
  "delta",
  "epsilon",
  "zeta",
  "eta",
  "theta",
  "iota",
  "kappa",
] as const;

const GROUPS = ["red", "green", "blue", "yellow"] as const;

export type Prng = () => number;

export function mulberry32(seed: number): Prng {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(rng: Prng, items: readonly T[]): T {
  const idx = Math.floor(rng() * items.length);
  return items[idx]!;
}

export function generateRecords(seed: number, count: number): AppRecord[] {
  const rng = mulberry32(seed);
  const out: AppRecord[] = [];
  for (let i = 0; i < count; i++) {
    const tagCount = Math.floor(rng() * 4); // 0..3
    let tags: string[] | undefined;
    if (tagCount > 0) {
      const seen = new Set<string>();
      tags = [];
      while (tags.length < tagCount) {
        const t = pick(rng, TAGS);
        if (seen.has(t)) continue;
        seen.add(t);
        tags.push(t);
      }
    }
    const base: AppRecord = {
      id: `rec-${String(i).padStart(4, "0")}`,
      group: pick(rng, GROUPS),
      value: Math.round(rng() * 10000) / 100,
      ts: i * 10 + Math.floor(rng() * 5),
    };
    out.push(tags === undefined ? base : { ...base, tags });
  }
  return out;
}

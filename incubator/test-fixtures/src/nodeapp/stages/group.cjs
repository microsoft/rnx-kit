// @ts-check
/**
 * Group-merging helper authored as raw CommonJS. Required by `aggregate.cjs`
 * via plain `require` — pure CJS-to-CJS edge.
 */

"use strict";

/**
 * @typedef {import("../types.ts").AppRecord} AppRecord
 * @typedef {import("../types.ts").GroupSummary} GroupSummary
 *
 * @typedef {Object} GroupBucket
 * @property {number} count
 * @property {number} sum
 */

/**
 * @param {ReadonlyArray<AppRecord>} records
 * @returns {Map<string, GroupBucket>}
 */
function bucketize(records) {
  /** @type {Map<string, GroupBucket>} */
  const buckets = new Map();
  for (const r of records) {
    const existing = buckets.get(r.group);
    if (existing) {
      existing.count++;
      existing.sum += r.value;
    } else {
      buckets.set(r.group, { count: 1, sum: r.value });
    }
  }
  return buckets;
}

/**
 * @param {Map<string, GroupBucket>} buckets
 * @returns {Record<string, GroupSummary>}
 */
function summarizeBuckets(buckets) {
  /** @type {Record<string, GroupSummary>} */
  const out = {};
  const keys = Array.from(buckets.keys()).sort();
  for (const key of keys) {
    const b = /** @type {GroupBucket} */ (buckets.get(key));
    out[key] = {
      count: b.count,
      sum: b.sum,
      mean: b.count > 0 ? b.sum / b.count : 0,
    };
  }
  return out;
}

module.exports = { bucketize, summarizeBuckets };

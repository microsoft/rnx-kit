// @ts-check
/**
 * Aggregator authored as raw CommonJS.
 *
 * Pipeline imports this dynamically via `await import(".../aggregate.cjs")`
 * (ESM-to-CJS). Inside, it `require`s `group.cjs` (CJS-to-CJS) and dynamically
 * imports the raw `.mjs` constants module (CJS-to-ESM).
 */

"use strict";

const { PipelineError } = require("../errors.cjs");
const { bucketize, summarizeBuckets } = require("./group.cjs");

/**
 * @typedef {import("../types.ts").AppRecord} AppRecord
 * @typedef {import("../types.ts").GroupSummary} GroupSummary
 */

class Aggregator {
  /** @param {ReadonlyArray<AppRecord>} records */
  constructor(records) {
    /** @type {ReadonlyArray<AppRecord>} */
    this._records = records;
  }

  /** @returns {Record<string, GroupSummary>} */
  groupSummary() {
    try {
      return summarizeBuckets(bucketize(this._records));
    } catch (e) {
      throw new PipelineError(
        "aggregate",
        "failed to compute group summary",
        e instanceof Error ? e : undefined
      );
    }
  }

  /**
   * Dynamic ESM import from a CJS module — exercises the bundler's
   * CJS-to-ESM interop path.
   * @returns {Promise<number>}
   */
  async epsilonAwareTotal() {
    const constants = await import("../util/constants.mjs");
    let sum = 0;
    for (const r of this._records) {
      sum += r.value;
    }
    return Math.abs(sum) < constants.EPSILON ? 0 : sum;
  }
}

/**
 * @param {ReadonlyArray<AppRecord>} records
 * @returns {Record<string, GroupSummary>}
 */
function aggregateGroups(records) {
  return new Aggregator(records).groupSummary();
}

module.exports = { Aggregator, aggregateGroups };

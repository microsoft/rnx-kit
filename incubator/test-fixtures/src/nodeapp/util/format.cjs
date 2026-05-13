// @ts-check
/**
 * Raw CommonJS file (not TypeScript). Tests bundler handling of raw `.cjs`
 * source. Type-checked via `checkJs: true` + JSDoc.
 */

"use strict";

/**
 * Pad a number with leading zeros to the given width.
 * @param {number} n
 * @param {number} width
 * @returns {string}
 */
function pad(n, width) {
  const s = String(n);
  if (s.length >= width) return s;
  return "0".repeat(width - s.length) + s;
}

/**
 * Round to a fixed number of decimal places, returning a number (not a string).
 * Stable across V8 versions because we route through string serialisation.
 * @param {number} value
 * @param {number} [decimals]
 * @returns {number}
 */
function roundTo(value, decimals = 6) {
  if (!Number.isFinite(value)) return value;
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

/**
 * Format a window range as `[start..end]`.
 * @param {number} start
 * @param {number} end
 * @returns {string}
 */
function formatRange(start, end) {
  return `[${start}..${end}]`;
}

module.exports = { pad, roundTo, formatRange };

// @ts-check
/**
 * Raw CommonJS module of custom error classes. Type-checked via JSDoc.
 *
 * Imported by TypeScript and raw JavaScript consumers, exercising
 * named-import-from-CommonJS interop in bundlers.
 */

"use strict";

class ParseError extends Error {
  /**
   * @param {string} message
   * @param {ReadonlyArray<string | number>} [path]
   */
  constructor(message, path = []) {
    super(message);
    this.name = "ParseError";
    /** @type {ReadonlyArray<string | number>} */
    this.path = path;
  }
}

class ValidationError extends Error {
  /**
   * @param {string} field
   * @param {string} message
   */
  constructor(field, message) {
    super(`${field}: ${message}`);
    this.name = "ValidationError";
    /** @type {string} */
    this.field = field;
  }
}

class PipelineError extends Error {
  /**
   * @param {string} stage
   * @param {string} message
   * @param {Error} [cause]
   */
  constructor(stage, message, cause) {
    super(`[${stage}] ${message}`, cause !== undefined ? { cause } : undefined);
    this.name = "PipelineError";
    /** @type {string} */
    this.stage = stage;
  }
}

module.exports = { ParseError, ValidationError, PipelineError };

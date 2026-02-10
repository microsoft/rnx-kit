// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.

/**
 * Shared types and utilities used across multiple modules.
 *
 * This module has no internal dependencies, so any module can import
 * from it without circular imports.
 *
 * @module common
 */

/** A string or a function that produces a string on demand. */
export type LazyString = string | (() => string);

/** Log level for logger callbacks. */
export type MessageLevel = "info" | "warn" | "error" | "debug";

/** Logger callback function signature. */
export type LoggerCallback = (level: MessageLevel, message: LazyString) => void;

/**
 * Evaluate a LazyString to a plain string.
 * If the input is already a string, returns it as-is.
 * If it is a function, calls it and returns the result.
 *
 * Unlike `renderString` in tty-ui.ts, this performs no TTY context setup.
 * Use this in contexts where TTY mode is irrelevant (e.g., file logging).
 */
export function resolve(lazy: LazyString): string {
  return typeof lazy === "string" ? lazy : lazy();
}

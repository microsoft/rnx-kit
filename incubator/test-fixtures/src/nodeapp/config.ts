/**
 * Option resolution. Pulls defaults from the raw ESM constants module.
 */

import type { Options, ResolvedOptions, StddevMode } from "./types.ts";
import {
  DEFAULT_STDDEV_MODE,
  DEFAULT_TOP_K,
  DEFAULT_WINDOW,
} from "./util/constants.mjs";

export function resolveOptions(options?: Options): ResolvedOptions {
  const {
    windowSize = DEFAULT_WINDOW,
    topK = DEFAULT_TOP_K,
    stddevMode = DEFAULT_STDDEV_MODE as StddevMode,
  } = options ?? {};
  return { windowSize, topK, stddevMode };
}

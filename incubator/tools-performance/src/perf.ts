import { nullTrace } from "./index.ts";
import { reportResults } from "./report.ts";
import { nullRecord } from "./trace.ts";
import { PerformanceTracker } from "./tracker.ts";
import type { PerfArea, PerformanceConfiguration } from "./types.ts";

export function createPerfManager(userConfig: PerformanceConfiguration = {}) {
  const config = { ...userConfig };
  const unscoped = Symbol("unscoped");
  const trackers: Record<string | symbol, PerformanceTracker> = {};
  const enabled = new Set<string | symbol>();
  let finished = false;

  function updateConfig(newConfig: PerformanceConfiguration) {
    Object.assign(config, newConfig);
  }

  // enable tracking for all categories, a specific category, or a list of categories
  function enable(category: true | string | string[]) {
    if (category === true) {
      enabled.add(unscoped);
    } else if (typeof category === "string") {
      enabled.add(category);
    } else if (Array.isArray(category)) {
      for (const cat of category) {
        enabled.add(cat);
      }
    }
  }

  function isEnabled(category?: string) {
    return enabled.has(category ?? unscoped);
  }

  // get a tracker if it is enabled, creating it if necessary. If not enabled will return undefined
  function getTracker(category?: string): PerformanceTracker | undefined {
    const key = category ?? unscoped;
    if (!enabled.has(key)) {
      return undefined;
    }
    return (trackers[key] ??= new PerformanceTracker(
      category,
      config.maxOperationWidth
    ));
  }

  function getTrace(category?: string) {
    const tracker = getTracker(category);
    return tracker?.trace ?? nullTrace;
  }

  function getRecorder(category?: string) {
    const tracker = getTracker(category);
    return tracker?.record ?? nullRecord;
  }

  function finish() {
    if (!finished) {
      const allResults = Object.values(trackers).flatMap((tracker) =>
        tracker.getResults()
      );
      if (allResults.length > 0) {
        console.log("Performance results:");
        reportResults(allResults, config);
      }
      finished = true;
    }
  }

  process.on("exit", () => {
    finish();
  });

  return {
    enable,
    isEnabled,
    finish,
    getTrace,
    getRecorder,
    updateConfig,
  };
}

let defaultManager: ReturnType<typeof createPerfManager> | undefined =
  undefined;

/**
 * Start tracking performance for the specified mode and configuration. Mode can be:
 * - true to enable all tracking
 * - a specific area to track (e.g. "metro", "resolve", "transform", "serialize")
 * - a list of areas to track
 * - undefined which will default to true and enable all tracking
 * Calling multiple times will be additive in terms of areas tracked and will overwrite the configuration
 *
 * @param mode tracking modes to enable
 * @param config performance configuration
 */
export function trackPerformance(
  mode: true | PerfArea | PerfArea[] = true,
  config?: PerformanceConfiguration
) {
  if (!defaultManager) {
    defaultManager = createPerfManager(config);
  } else if (config) {
    defaultManager.updateConfig(config);
  }
  defaultManager.enable(mode);
}

/**
 * Finish tracking (rather than waiting for process exit) and print the report to the console.
 */
export function finishTracking() {
  defaultManager?.finish();
}

/**
 * Check if tracking is enabled for a specific category. If category is undefined, checks if all tracking is enabled.
 */
export function isTrackingEnabled(category?: string) {
  return defaultManager?.isEnabled(category) ?? false;
}

/**
 * Get a trace function for the specified category. If not enabled it will be a non-tracking passthrough
 * @param category category or undefined for unscoped
 */
export function getTrace(category?: string) {
  return defaultManager?.getTrace(category) ?? nullTrace;
}

/**
 * Get a recorder function for the specified category. If not enabled it will be a non-tracking no-op
 * @param category category or undefined for unscoped
 */
export function getRecorder(category?: string) {
  return defaultManager?.getRecorder(category) ?? nullRecord;
}

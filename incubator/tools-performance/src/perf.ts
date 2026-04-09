import { nullRecord, nullTrace } from "./trace.ts";
import { PerfManager } from "./tracker.ts";
import type { PerfArea, PerformanceConfiguration } from "./types.ts";

let defaultManager: PerfManager | undefined = undefined;

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
    defaultManager = new PerfManager(config);
  } else if (config) {
    defaultManager.updateConfig(config);
  }
  defaultManager.enable(mode);
}

/**
 * Finish tracking (rather than waiting for process exit) and print the report to the console.
 * @param peekOnly if true, will print the report but continue tracking and still report out at process exit.
 */
export function reportPerfData(peekOnly = false) {
  defaultManager?.report(peekOnly);
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

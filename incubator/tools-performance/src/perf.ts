import { nullTrace } from "./trace.ts";
import { PerfTracker } from "./tracker.ts";
import type { EventFrequency, PerformanceOptions } from "./types.ts";

let defaultManager: PerfTracker | undefined = undefined;

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
export function trackPerformance(config: PerformanceOptions = {}) {
  if (!defaultManager) {
    defaultManager = new PerfTracker(config);
  } else {
    defaultManager.updateConfig(config);
  }
}

/**
 * Finish tracking (rather than waiting for process exit) and print the report to the console.
 */
export function reportPerfData() {
  defaultManager?.finish();
}

/**
 * Check if tracking is enabled for a specific category. If category is undefined, checks if all tracking is enabled.
 */
export function isTrackingEnabled(domain: string, frequency?: EventFrequency) {
  return Boolean(defaultManager?.isEnabled(domain, frequency));
}

/**
 * Get a trace function for the specified category. If not enabled it will be a non-tracking passthrough
 * @param category category or undefined for unscoped
 */
export function getTrace(domain: string, frequency?: EventFrequency) {
  return defaultManager?.domain(domain)?.getTrace(frequency) ?? nullTrace;
}

/**
 * Get the specific perf domain if it is enabled, otherwise undefined
 */
export function getDomain(name: string) {
  return defaultManager?.domain(name);
}

/**
 * Register a subdomain under a parent domain. This domain will be enabled whenever the parent domain is enabled but can
 * be enabled or tracked separately as well.
 */
export function registerSubdomain(domain: string, subdomain: string) {
  defaultManager?.registerSubdomain(domain, subdomain);
}

/**
 * Reset the module-level performance tracker, releasing all domains and state.
 * Intended for test isolation — not part of the public API.
 * @internal
 */
export function resetPerfData() {
  defaultManager?.finish();
  defaultManager = undefined;
}

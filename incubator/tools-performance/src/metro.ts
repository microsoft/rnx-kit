import type {
  PerfAnnotations,
  PerfLogger,
  RootPerfLogger,
  PerfLoggerFactoryOptions,
  PerfLoggerFactory,
  PerfLoggerPointOptions,
} from "metro-config";
import { type PerfDomain } from "./domain.ts";
import { getDomain, registerSubdomain } from "./perf.ts";
import { nullFunction } from "./trace.ts";

function createEmptyLogger(): PerfLogger {
  return {
    point: nullFunction,
    annotate: nullFunction,
    subSpan: createEmptyLogger,
  };
}

// metro uses point events with _start and _end to indicate the start and end of events
const POINT_START_SUFFIX = "_start";
const POINT_END_SUFFIX = "_end";

function getSubdomainLogger(
  base: string,
  key?: string
): [PerfLogger, PerfDomain | undefined] {
  key = key != null ? `:${key}` : "";
  const subdomain = `${base}${key}`;
  // register the subdomain to ensure the associations are set up correctly in the tracker
  registerSubdomain("metro", subdomain);
  // now get the subdomain itself so we can create a logger for it
  const domain = getDomain(`metro:${subdomain}`);
  const logger = createLogger(subdomain, domain);
  return [logger, domain];
}

function createLogger(subdomainName: string, domain?: PerfDomain): PerfLogger {
  if (!domain) {
    return createEmptyLogger();
  }
  const openEvents: Record<string, () => void> = {};
  return {
    point(name: string, _opts?: PerfLoggerPointOptions) {
      if (name.endsWith(POINT_START_SUFFIX)) {
        const eventKey = name.slice(0, -POINT_START_SUFFIX.length);
        // this shouldn't happen but close any open event with the same name just in case
        openEvents[eventKey]?.();
        // now open the event for this point
        openEvents[eventKey] = domain.startEvent(eventKey);
      } else if (name.endsWith(POINT_END_SUFFIX)) {
        const eventKey = name.slice(0, -POINT_END_SUFFIX.length);
        const endEvent = openEvents[eventKey];
        if (endEvent) {
          endEvent();
          delete openEvents[eventKey];
        }
      }
    },
    annotate(_annotations: PerfAnnotations) {
      // do nothing for annotations
    },
    subSpan(label: string): PerfLogger {
      const [logger] = getSubdomainLogger(subdomainName, label);
      return logger;
    },
  };
}

/**
 * Create a PerfLoggerFactory that integrates with tools-performance. This will log events
 * based on the "metro" domain being enabled.
 */
export function createPerfLoggerFactory(): PerfLoggerFactory | undefined {
  return (
    type: "START_UP" | "BUNDLING_REQUEST" | "HMR",
    opts?: PerfLoggerFactoryOptions
  ): RootPerfLogger => {
    const keyStr = opts?.key != null ? `#${opts.key}` : undefined;
    const [logger, domain] = getSubdomainLogger(type.toLowerCase(), keyStr);

    return {
      ...logger,
      start(_startOpts) {
        domain?.start();
      },
      end(_status, _endOpts) {
        domain?.stop();
      },
    };
  };
}

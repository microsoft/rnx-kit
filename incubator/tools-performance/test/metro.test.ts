import { equal, ok } from "node:assert/strict";
import { afterEach, describe, it } from "node:test";
import { createPerfLoggerFactory } from "../src/metro.ts";
import { getDomain, resetPerfData, trackPerformance } from "../src/perf.ts";

function noopHandler() {
  // intentionally empty — suppresses report output for tests
}

afterEach(() => {
  resetPerfData();
});

describe("createPerfLoggerFactory", () => {
  it("returns a factory function", () => {
    const factory = createPerfLoggerFactory();
    equal(typeof factory, "function");
  });

  it("factory returns a RootPerfLogger with all methods", () => {
    trackPerformance({ enable: "metro", strategy: "timing" });
    const factory = createPerfLoggerFactory();
    const logger = factory("START_UP");
    equal(typeof logger.start, "function");
    equal(typeof logger.end, "function");
    equal(typeof logger.point, "function");
    equal(typeof logger.annotate, "function");
    equal(typeof logger.subSpan, "function");
  });

  it("creates a subdomain under metro when factory is called", () => {
    trackPerformance({ enable: "metro", strategy: "timing" });
    const factory = createPerfLoggerFactory();
    factory("START_UP");
    const domain = getDomain("metro:start_up");
    ok(domain !== undefined);
    equal(domain!.name, "metro:start_up");
  });

  it("enables subdomains when metro is enabled", () => {
    trackPerformance({ enable: "metro", strategy: "timing" });
    const factory = createPerfLoggerFactory();
    factory("BUNDLING_REQUEST");
    const domain = getDomain("metro:bundling_request");
    ok(domain !== undefined);
  });

  it("returns an empty logger when metro is not enabled", () => {
    trackPerformance({ enable: "resolve", strategy: "timing" });
    const factory = createPerfLoggerFactory();
    const logger = factory("START_UP");
    // should still have all methods but domain should be undefined
    equal(typeof logger.start, "function");
    equal(typeof logger.point, "function");
    const domain = getDomain("metro:start_up");
    equal(domain, undefined);
  });

  it("handles all factory type arguments", () => {
    trackPerformance({ enable: "metro", strategy: "timing" });
    const factory = createPerfLoggerFactory();
    const types = ["START_UP", "BUNDLING_REQUEST", "HMR"] as const;
    for (const type of types) {
      const logger = factory(type);
      ok(logger);
      equal(typeof logger.start, "function");
      ok(getDomain(`metro:${type.toLowerCase()}`) !== undefined);
    }
  });

  it("includes key in subdomain name when provided", () => {
    trackPerformance({ enable: "metro", strategy: "timing" });
    const factory = createPerfLoggerFactory();
    factory("BUNDLING_REQUEST", { key: 42 });
    const domain = getDomain("metro:bundling_request:#42");
    ok(domain !== undefined);
  });

  it("subSpan creates a nested subdomain", () => {
    trackPerformance({ enable: "metro", strategy: "timing" });
    const factory = createPerfLoggerFactory();
    const logger = factory("START_UP");
    logger.subSpan("transform");
    const domain = getDomain("metro:start_up:transform");
    ok(domain !== undefined);
  });

  it("nested subSpans create deeper subdomains", () => {
    trackPerformance({ enable: "metro", strategy: "timing" });
    const factory = createPerfLoggerFactory();
    const logger = factory("START_UP");
    const sub = logger.subSpan("resolver");
    sub.subSpan("haste");
    ok(getDomain("metro:start_up:resolver") !== undefined);
    ok(getDomain("metro:start_up:resolver:haste") !== undefined);
  });

  it("start and end control domain lifecycle", () => {
    trackPerformance({
      enable: "metro",
      strategy: "timing",
      reportHandler: noopHandler,
    });
    const factory = createPerfLoggerFactory();
    const logger = factory("START_UP");
    logger.start();
    logger.point("load_config_start");
    logger.point("load_config_end");
    logger.end("SUCCESS");
    // the domain should have been started and stopped
    const domain = getDomain("metro:start_up");
    ok(domain !== undefined);
  });

  it("point with _start/_end suffix records events", () => {
    trackPerformance({
      enable: "metro",
      strategy: "timing",
      reportHandler: noopHandler,
    });
    const factory = createPerfLoggerFactory();
    const logger = factory("START_UP");
    logger.start();
    logger.point("resolve_start");
    logger.point("resolve_end");
    logger.end("SUCCESS");
  });

  it("annotate does not throw", () => {
    trackPerformance({ enable: "metro", strategy: "timing" });
    const factory = createPerfLoggerFactory();
    const logger = factory("START_UP");
    logger.annotate({
      string: { platform: "ios" },
      bool: { dev: true },
    });
    logger.annotate({});
  });
});

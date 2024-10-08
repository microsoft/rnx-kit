import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { error, info, warn } from "../src/index";

describe("console", () => {
  const args = ["string", 0, true];

  const loggers = [
    { log: error, methodName: "error" as const },
    { log: info, logLevel: "info", methodName: "log" as const },
    { log: warn, methodName: "warn" as const },
  ];

  for (const { log, logLevel, methodName } of loggers) {
    const level = logLevel ?? methodName;
    it(`prints ${level} messages`, (t) => {
      const method = t.mock.method(console, methodName, () => null);

      log(...args);

      equal(method.mock.calls.length, 1);
      deepEqual(method.mock.calls[0].arguments, [level, ...args]);
    });
  }
});

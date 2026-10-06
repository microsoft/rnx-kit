import { deepEqual, equal, match } from "node:assert/strict";
import { describe, it } from "node:test";
import { parseResponse } from "../src/rubric.ts";

describe("parseResponse()", () => {
  it("parses JSON wrapped in a code block", () => {
    const response = '```json\n{ "pass": true, "reason": "ok" }\n```';
    deepEqual(parseResponse(response), { pass: true, score: 1, reason: "ok" });
  });

  it("fails on invalid JSON", () => {
    for (const response of ["{ pass: true }", "I cannot grade this"]) {
      const result = parseResponse(response);
      equal(result.pass, false);
      match(result.reason, /^Grader returned an invalid response/);
    }
  });

  it("fails if `pass` is missing or not a boolean", () => {
    for (const response of [
      '{ "reason": "ok" }',
      '{ "pass": "true", "reason": "ok" }',
      '{ "pass": 1, "reason": "ok" }',
    ]) {
      const result = parseResponse(response);
      equal(result.pass, false);
      match(result.reason, /^Grader returned an invalid response/);
    }
  });

  it("passes the grader's verdict through", () => {
    deepEqual(parseResponse('{ "pass": false, "reason": "no" }'), {
      pass: false,
      score: 0,
      reason: "no",
    });
  });
});

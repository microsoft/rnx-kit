import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type CharacterType,
  type ScanState,
  getNextCharType,
  graphemeWidth,
} from "../src/characters.ts";

const RED = "\x1b[31m";
const BOLD_RED = "\x1b[1;31m";
const RESET = "\x1b[0m";
const RESET_EMPTY = "\x1b[m";
const RESET_DOUBLE_ZERO = "\x1b[0;0m";
const CSI_CURSOR_UP = "\x1b[A";
const OSC_HYPERLINK = "\x1b]8;;https://example.com\x07";
const OSC_HYPERLINK_END = "\x1b]8;;\x07";

type Step = {
  charType: CharacterType;
  /** raw bytes consumed by this step */
  raw: string;
  /** visible-column width contributed by this step */
  width: number;
};

/** Drive `getNextCharType` through the entire string, collecting per-step output. */
function scan(s: string): Step[] {
  const steps: Step[] = [];
  const state: ScanState = { index: 0, width: 0, charType: "other" };
  let prev = 0;
  while (getNextCharType(s, state)) {
    steps.push({
      charType: state.charType,
      raw: s.slice(prev, state.index),
      width: state.width,
    });
    prev = state.index;
  }
  return steps;
}

describe("graphemeWidth", () => {
  it("returns 0 for an empty string", () => {
    equal(graphemeWidth(""), 0);
  });

  it("returns 1 for plain ASCII", () => {
    equal(graphemeWidth("a"), 1);
    equal(graphemeWidth("Z"), 1);
    equal(graphemeWidth(" "), 1);
  });

  it("returns 0 for C0 / C1 control characters", () => {
    equal(graphemeWidth("\t"), 0);
    equal(graphemeWidth("\x1b"), 0);
    equal(graphemeWidth("\x7f"), 0);
    equal(graphemeWidth("\x9b"), 0);
  });

  it("returns 0 for zero-width formatting characters", () => {
    equal(graphemeWidth("​"), 0); // zero-width space
    equal(graphemeWidth("‍"), 0); // zero-width joiner
    equal(graphemeWidth("﻿"), 0); // BOM
  });

  it("returns 0 for combining marks", () => {
    equal(graphemeWidth("́"), 0); // combining acute
    equal(graphemeWidth("̈"), 0); // combining diaeresis
  });

  it("returns 2 for East Asian Wide characters", () => {
    equal(graphemeWidth("中"), 2);
    equal(graphemeWidth("漢"), 2);
    equal(graphemeWidth("あ"), 2); // Hiragana
    equal(graphemeWidth("한"), 2); // Hangul
  });

  it("returns 2 for emoji in the SMP", () => {
    equal(graphemeWidth("🎉"), 2);
    equal(graphemeWidth("🚀"), 2);
  });
});

describe("getNextCharType", () => {
  it("returns false immediately on an empty string", () => {
    const state: ScanState = { index: 0, width: 0, charType: "other" };
    equal(getNextCharType("", state), false);
  });

  it("classifies plain ASCII as 'other' with width 1, one code unit at a time", () => {
    const steps = scan("abc");
    deepEqual(steps, [
      { charType: "other", raw: "a", width: 1 },
      { charType: "other", raw: "b", width: 1 },
      { charType: "other", raw: "c", width: 1 },
    ]);
  });

  it("classifies LF as a single zero-width line-break", () => {
    const steps = scan("a\nb");
    deepEqual(steps, [
      { charType: "other", raw: "a", width: 1 },
      { charType: "line-break", raw: "\n", width: 0 },
      { charType: "other", raw: "b", width: 1 },
    ]);
  });

  it("classifies CRLF as a single zero-width line-break", () => {
    const steps = scan("a\r\nb");
    deepEqual(steps, [
      { charType: "other", raw: "a", width: 1 },
      { charType: "line-break", raw: "\r\n", width: 0 },
      { charType: "other", raw: "b", width: 1 },
    ]);
  });

  it("classifies a lone CR as a line-break", () => {
    const steps = scan("a\rb");
    deepEqual(steps, [
      { charType: "other", raw: "a", width: 1 },
      { charType: "line-break", raw: "\r", width: 0 },
      { charType: "other", raw: "b", width: 1 },
    ]);
  });

  it("classifies a non-reset SGR sequence as 'sgr-open'", () => {
    const steps = scan(RED);
    deepEqual(steps, [{ charType: "sgr-open", raw: RED, width: 0 }]);
  });

  it("classifies multi-parameter SGR as 'sgr-open'", () => {
    const steps = scan(BOLD_RED);
    deepEqual(steps, [{ charType: "sgr-open", raw: BOLD_RED, width: 0 }]);
  });

  it("classifies an SGR full reset as 'sgr-close'", () => {
    deepEqual(scan(RESET), [{ charType: "sgr-close", raw: RESET, width: 0 }]);
    // Empty parameter list (`\x1b[m`) is equivalent to reset.
    deepEqual(scan(RESET_EMPTY), [
      { charType: "sgr-close", raw: RESET_EMPTY, width: 0 },
    ]);
    // Multiple-zero params (`\x1b[0;0m`) are also a reset.
    deepEqual(scan(RESET_DOUBLE_ZERO), [
      { charType: "sgr-close", raw: RESET_DOUBLE_ZERO, width: 0 },
    ]);
  });

  it("classifies non-SGR CSI sequences as 'control'", () => {
    deepEqual(scan(CSI_CURSOR_UP), [
      { charType: "control", raw: CSI_CURSOR_UP, width: 0 },
    ]);
  });

  it("classifies OSC sequences as 'control'", () => {
    deepEqual(scan(OSC_HYPERLINK), [
      { charType: "control", raw: OSC_HYPERLINK, width: 0 },
    ]);
    deepEqual(scan(OSC_HYPERLINK_END), [
      { charType: "control", raw: OSC_HYPERLINK_END, width: 0 },
    ]);
  });

  it("consumes a lone ESC as a single 'control' byte", () => {
    deepEqual(scan("\x1bx"), [
      { charType: "control", raw: "\x1b", width: 0 },
      { charType: "other", raw: "x", width: 1 },
    ]);
  });

  it("uses Intl.Segmenter for non-ASCII graphemes", () => {
    // "中" is a single CJK ideograph (one UTF-16 code unit, width 2).
    const steps = scan("a中b");
    deepEqual(steps, [
      { charType: "other", raw: "a", width: 1 },
      { charType: "other", raw: "中", width: 2 },
      { charType: "other", raw: "b", width: 1 },
    ]);
  });

  it("treats a combining mark following an ASCII base as a separate zero-width step", () => {
    // The ASCII fast path consumes 'e' on its own; the combining mark is
    // reported on the next step with width 0.
    const steps = scan("é");
    deepEqual(steps, [
      { charType: "other", raw: "e", width: 1 },
      { charType: "other", raw: "́", width: 0 },
    ]);
  });

  it("groups multi-code-point graphemes when they are non-ASCII", () => {
    // A regional-indicator flag is two surrogate pairs forming one grapheme.
    const flag = "🇺🇸";
    const steps = scan(flag);
    equal(steps.length, 1);
    equal(steps[0].charType, "other");
    equal(steps[0].raw, flag);
    equal(steps[0].width, 2);
  });

  it("interleaves SGR, line-break, and visible characters in stream order", () => {
    const input = `${RED}ab\n${RESET}c`;
    deepEqual(scan(input), [
      { charType: "sgr-open", raw: RED, width: 0 },
      { charType: "other", raw: "a", width: 1 },
      { charType: "other", raw: "b", width: 1 },
      { charType: "line-break", raw: "\n", width: 0 },
      { charType: "sgr-close", raw: RESET, width: 0 },
      { charType: "other", raw: "c", width: 1 },
    ]);
  });

  it("advances state.index by exactly the raw step length each call", () => {
    const input = `a${RED}b\nc中`;
    const state: ScanState = { index: 0, width: 0, charType: "other" };
    let totalRawLength = 0;
    while (getNextCharType(input, state)) {
      totalRawLength = state.index;
    }
    equal(totalRawLength, input.length);
    ok(state.index === input.length);
  });
});

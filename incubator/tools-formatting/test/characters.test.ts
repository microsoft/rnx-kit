import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  type BreakStrategy,
  type CharacterType,
  applySgrSequence,
  clearSgrState,
  createScanState,
  createSgrState,
  getNextCharType,
  graphemeWidth,
  isSgrStateEmpty,
  renderSgrState,
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
  /** break-opportunity classification for the wrap algorithm */
  breakStrategy: BreakStrategy;
};

/** Drive `getNextCharType` through the entire string, collecting per-step output. */
function scan(s: string): Step[] {
  const steps: Step[] = [];
  const state = createScanState();
  let prev = 0;
  while (getNextCharType(s, state)) {
    steps.push({
      charType: state.charType,
      raw: s.slice(prev, state.index),
      width: state.width,
      breakStrategy: state.breakStrategy,
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
    const state = createScanState();
    equal(getNextCharType("", state), false);
  });

  it("classifies plain ASCII as 'other' with width 1, one code unit at a time", () => {
    const steps = scan("abc");
    deepEqual(steps, [
      { charType: "other", raw: "a", width: 1, breakStrategy: "none" },
      { charType: "other", raw: "b", width: 1, breakStrategy: "none" },
      { charType: "other", raw: "c", width: 1, breakStrategy: "none" },
    ]);
  });

  it("classifies LF as a single zero-width line-break", () => {
    const steps = scan("a\nb");
    deepEqual(steps, [
      { charType: "other", raw: "a", width: 1, breakStrategy: "none" },
      { charType: "line-break", raw: "\n", width: 0, breakStrategy: "none" },
      { charType: "other", raw: "b", width: 1, breakStrategy: "none" },
    ]);
  });

  it("classifies CRLF as a single zero-width line-break", () => {
    const steps = scan("a\r\nb");
    deepEqual(steps, [
      { charType: "other", raw: "a", width: 1, breakStrategy: "none" },
      { charType: "line-break", raw: "\r\n", width: 0, breakStrategy: "none" },
      { charType: "other", raw: "b", width: 1, breakStrategy: "none" },
    ]);
  });

  it("classifies a lone CR as a line-break", () => {
    const steps = scan("a\rb");
    deepEqual(steps, [
      { charType: "other", raw: "a", width: 1, breakStrategy: "none" },
      { charType: "line-break", raw: "\r", width: 0, breakStrategy: "none" },
      { charType: "other", raw: "b", width: 1, breakStrategy: "none" },
    ]);
  });

  it("classifies a non-reset SGR sequence as 'sgr-open'", () => {
    const steps = scan(RED);
    deepEqual(steps, [
      { charType: "sgr-open", raw: RED, width: 0, breakStrategy: "none" },
    ]);
  });

  it("classifies multi-parameter SGR as 'sgr-open'", () => {
    const steps = scan(BOLD_RED);
    deepEqual(steps, [
      { charType: "sgr-open", raw: BOLD_RED, width: 0, breakStrategy: "none" },
    ]);
  });

  it("classifies an SGR full reset as 'sgr-close'", () => {
    deepEqual(scan(RESET), [
      { charType: "sgr-close", raw: RESET, width: 0, breakStrategy: "none" },
    ]);
    // Empty parameter list (`\x1b[m`) is equivalent to reset.
    deepEqual(scan(RESET_EMPTY), [
      {
        charType: "sgr-close",
        raw: RESET_EMPTY,
        width: 0,
        breakStrategy: "none",
      },
    ]);
    // Multiple-zero params (`\x1b[0;0m`) are also a reset.
    deepEqual(scan(RESET_DOUBLE_ZERO), [
      {
        charType: "sgr-close",
        raw: RESET_DOUBLE_ZERO,
        width: 0,
        breakStrategy: "none",
      },
    ]);
  });

  it("classifies non-SGR CSI sequences as 'control'", () => {
    deepEqual(scan(CSI_CURSOR_UP), [
      {
        charType: "control",
        raw: CSI_CURSOR_UP,
        width: 0,
        breakStrategy: "none",
      },
    ]);
  });

  it("classifies OSC sequences as 'control'", () => {
    deepEqual(scan(OSC_HYPERLINK), [
      {
        charType: "control",
        raw: OSC_HYPERLINK,
        width: 0,
        breakStrategy: "none",
      },
    ]);
    deepEqual(scan(OSC_HYPERLINK_END), [
      {
        charType: "control",
        raw: OSC_HYPERLINK_END,
        width: 0,
        breakStrategy: "none",
      },
    ]);
  });

  it("consumes a lone ESC as a single 'control' byte", () => {
    deepEqual(scan("\x1bx"), [
      { charType: "control", raw: "\x1b", width: 0, breakStrategy: "none" },
      { charType: "other", raw: "x", width: 1, breakStrategy: "none" },
    ]);
  });

  it("uses Intl.Segmenter for non-ASCII graphemes", () => {
    // "中" is a single CJK ideograph (one UTF-16 code unit, width 2).
    const steps = scan("a中b");
    deepEqual(steps, [
      { charType: "other", raw: "a", width: 1, breakStrategy: "none" },
      { charType: "other", raw: "中", width: 2, breakStrategy: "after" },
      { charType: "other", raw: "b", width: 1, breakStrategy: "none" },
    ]);
  });

  it("treats a combining mark following an ASCII base as a separate zero-width step", () => {
    // The ASCII fast path consumes 'e' on its own; the combining mark is
    // reported on the next step with width 0.
    const steps = scan("é");
    deepEqual(steps, [
      { charType: "other", raw: "e", width: 1, breakStrategy: "none" },
      { charType: "other", raw: "́", width: 0, breakStrategy: "none" },
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
    // Wide graphemes are classified as `"after"` break points.
    equal(steps[0].breakStrategy, "after");
  });

  it("classifies ASCII space and tab as 'replace' break points", () => {
    deepEqual(scan(" "), [
      { charType: "other", raw: " ", width: 1, breakStrategy: "replace" },
    ]);
    deepEqual(scan("\t"), [
      { charType: "other", raw: "\t", width: 0, breakStrategy: "replace" },
    ]);
  });

  it("classifies CJK ideographs as 'after' break points", () => {
    deepEqual(scan("中文"), [
      { charType: "other", raw: "中", width: 2, breakStrategy: "after" },
      { charType: "other", raw: "文", width: 2, breakStrategy: "after" },
    ]);
  });

  it("classifies non-ASCII narrow graphemes as 'none'", () => {
    // Latin-extended letters are width 1 and shouldn't introduce break points.
    deepEqual(scan("ñ"), [
      { charType: "other", raw: "ñ", width: 1, breakStrategy: "none" },
    ]);
  });

  it("interleaves SGR, line-break, and visible characters in stream order", () => {
    const input = `${RED}ab\n${RESET}c`;
    deepEqual(scan(input), [
      { charType: "sgr-open", raw: RED, width: 0, breakStrategy: "none" },
      { charType: "other", raw: "a", width: 1, breakStrategy: "none" },
      { charType: "other", raw: "b", width: 1, breakStrategy: "none" },
      { charType: "line-break", raw: "\n", width: 0, breakStrategy: "none" },
      { charType: "sgr-close", raw: RESET, width: 0, breakStrategy: "none" },
      { charType: "other", raw: "c", width: 1, breakStrategy: "none" },
    ]);
  });

  it("advances state.index by exactly the raw step length each call", () => {
    const input = `a${RED}b\nc中`;
    const state = createScanState();
    let totalRawLength = 0;
    while (getNextCharType(input, state)) {
      totalRawLength = state.index;
    }
    equal(totalRawLength, input.length);
    ok(state.index === input.length);
  });

  it("auto-updates sgrState through SGR steps when supplied", () => {
    const sgr = createSgrState();
    const state = createScanState();
    while (getNextCharType("\x1b[1;31mhello\x1b[0m", state, sgr)) {
      // sgr is updated in-place; we just need to drain the string
    }
    // Final reset should leave sgr empty.
    equal(isSgrStateEmpty(sgr), true);
  });

  it("leaves sgrState untouched on non-SGR steps", () => {
    const sgr = createSgrState();
    sgr.bold = true;
    const state = createScanState();
    // Drive a string with no SGR — bold should remain set.
    while (getNextCharType("plain text\n", state, sgr)) {
      /* drain */
    }
    equal(sgr.bold, true);
  });
});

describe("SgrState helpers", () => {
  it("createSgrState / isSgrStateEmpty round-trip", () => {
    const s = createSgrState();
    equal(isSgrStateEmpty(s), true);
    s.opens = "\x1b[31m";
    equal(isSgrStateEmpty(s), false);
    clearSgrState(s);
    equal(isSgrStateEmpty(s), true);
  });

  it("renderSgrState returns the accumulated opens string", () => {
    const s = createSgrState();
    equal(renderSgrState(s), "");
    applySgrSequence(s, "\x1b[31m");
    applySgrSequence(s, "\x1b[1m");
    equal(renderSgrState(s), "\x1b[31m\x1b[1m");
  });

  it("applySgrSequence appends non-reset sequences verbatim", () => {
    const s = createSgrState();
    applySgrSequence(s, "\x1b[31m");
    applySgrSequence(s, "\x1b[1m");
    // Selective closes are still treated as opens by the accumulator.
    applySgrSequence(s, "\x1b[39m");
    equal(s.opens, "\x1b[31m\x1b[1m\x1b[39m");
  });

  it("applySgrSequence clears opens on every full-reset shape", () => {
    for (const reset of ["\x1b[0m", "\x1b[m", "\x1b[0;0m"]) {
      const s = createSgrState();
      applySgrSequence(s, "\x1b[1;31m");
      ok(!isSgrStateEmpty(s));
      applySgrSequence(s, reset);
      equal(isSgrStateEmpty(s), true);
    }
  });
});

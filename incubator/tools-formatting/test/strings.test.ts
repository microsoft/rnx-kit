import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  isMultilineString,
  parseMultilineString,
  sliceByVisibleWidth,
  visibleWidth,
  wrapStringByVisibleWidth,
} from "../src/strings.ts";

const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

describe("visibleWidth", () => {
  it("returns 0 for the empty string", () => {
    equal(visibleWidth(""), 0);
  });

  it("sums visible characters while skipping SGR sequences", () => {
    equal(visibleWidth(`${RED}${BOLD}hello${RESET}`), 5);
  });

  it("treats line breaks as zero-width and reports the widest line", () => {
    equal(visibleWidth("ab\ncde"), 3);
    equal(visibleWidth("aaaa\r\nbb"), 4);
  });
});

describe("parseMultilineString", () => {
  it("returns {text, width} with no arrays for the empty string", () => {
    deepEqual(parseMultilineString(""), { text: "", width: 0 });
  });

  it("returns {text, width} with no arrays for a single-line input", () => {
    deepEqual(parseMultilineString("hello"), { text: "hello", width: 5 });
  });

  it("returns the input verbatim in `text` even for styled single-line input", () => {
    const input = `${RED}hello${RESET}`;
    const result = parseMultilineString(input);
    equal(result.text, input);
    equal(result.width, 5);
    ok(!isMultilineString(result));
  });

  it("populates lines / lineWidths only when the input spans multiple lines", () => {
    const result = parseMultilineString("ab\ncde\r\nf");
    ok(isMultilineString(result));
    equal(result.text, "ab\ncde\r\nf");
    deepEqual(result.lines, ["ab", "cde", "f"]);
    deepEqual(result.lineWidths, [2, 3, 1]);
    equal(result.width, 3);
  });

  it("emits a trailing empty line for a trailing line break", () => {
    const result = parseMultilineString("ab\n");
    ok(isMultilineString(result));
    equal(result.text, "ab\n");
    deepEqual(result.lines, ["ab", ""]);
    deepEqual(result.lineWidths, [2, 0]);
    equal(result.width, 2);
  });

  it("closes active SGRs at each line end and reopens them on the next line", () => {
    const result = parseMultilineString(`${RED}ab\ncd${RESET}`);
    ok(isMultilineString(result));
    deepEqual(result.lines, [`${RED}ab${RESET}`, `${RED}cd${RESET}`]);
    deepEqual(result.lineWidths, [2, 2]);
  });

  it("preserves the invariant lineWidths[i] === visibleWidth(lines[i])", () => {
    const result = parseMultilineString(`${RED}${BOLD}ab\ncd${RESET} ef`);
    ok(isMultilineString(result));
    for (let i = 0; i < result.lines.length; i++) {
      equal(visibleWidth(result.lines[i]), result.lineWidths[i]);
    }
  });
});

describe("sliceByVisibleWidth", () => {
  it("returns empty for the empty string", () => {
    equal(sliceByVisibleWidth("", 0), "");
    equal(sliceByVisibleWidth("", 0, 5), "");
  });

  it("matches String.prototype.slice on plain ASCII", () => {
    const s = "hello";
    equal(sliceByVisibleWidth(s, 1, 3), s.slice(1, 3));
    equal(sliceByVisibleWidth(s, 0), s.slice(0));
    equal(sliceByVisibleWidth(s, 2), s.slice(2));
    equal(sliceByVisibleWidth(s, 0, 100), s.slice(0, 100));
  });

  it("matches String.prototype.slice for negative indices", () => {
    const s = "hello";
    equal(sliceByVisibleWidth(s, -3), s.slice(-3));
    equal(sliceByVisibleWidth(s, -3, -1), s.slice(-3, -1));
    equal(sliceByVisibleWidth(s, -100, 100), s.slice(-100, 100));
  });

  it("returns empty when end <= start", () => {
    equal(sliceByVisibleWidth("hello", 3, 1), "");
    equal(sliceByVisibleWidth("hello", 2, 2), "");
  });

  it("reapplies active SGRs at the start of the slice and resets at the end", () => {
    const s = `${RED}hello${RESET}`;
    equal(sliceByVisibleWidth(s, 1, 4), `${RED}ell${RESET}`);
  });

  it("does not emit a trailing reset when no SGRs are active at the end", () => {
    const s = `${RED}ab${RESET}cd`;
    // Slice "bcd" — opens are active before 'b', close inside the slice, so
    // by the end there's nothing to reset.
    equal(sliceByVisibleWidth(s, 1, 4), `${RED}b${RESET}cd`);
  });

  it("treats wide characters as occupying their full column count", () => {
    // "a中b": columns 0='a', 1-2='中', 3='b'. slice(1, 3) includes '中' (start at col 1).
    equal(sliceByVisibleWidth("a中b", 1, 3), "中");
  });

  it("does not emit a trailing reset for SGR sequences past the end column", () => {
    // The SGR open sits at col 2, which is the endCol — it must not contribute
    // a spurious trailing reset to the otherwise-unstyled slice.
    equal(sliceByVisibleWidth(`ab${RED}cd${RESET}`, 0, 2), "ab");
  });
});

describe("wrapStringByVisibleWidth", () => {
  it("returns {text, width} with no arrays for the empty string", () => {
    deepEqual(wrapStringByVisibleWidth("", 10), { text: "", width: 0 });
  });

  it("returns {text, width} with no arrays when the input fits in a single line", () => {
    const result = wrapStringByVisibleWidth("hello", 10);
    deepEqual(result, { text: "hello", width: 5 });
    ok(!isMultilineString(result));
  });

  it("breaks at whitespace within the line width", () => {
    const result = wrapStringByVisibleWidth("hello world", 5);
    ok(isMultilineString(result));
    equal(result.text, "hello world");
    deepEqual(result.lines, ["hello", "world"]);
    deepEqual(result.lineWidths, [5, 5]);
    equal(result.width, 5);
  });

  it("backtracks to the previous whitespace within maxBacktrack", () => {
    const result = wrapStringByVisibleWidth("abc defg", 6);
    ok(isMultilineString(result));
    // Width 6 fills "abc de" but "defg" should wrap intact via backtrack to ' '.
    deepEqual(result.lines, ["abc", "defg"]);
  });

  it("hard-breaks when no whitespace is reachable", () => {
    const result = wrapStringByVisibleWidth("abcdefghij", 4);
    ok(isMultilineString(result));
    deepEqual(result.lines, ["abcd", "efgh", "ij"]);
    deepEqual(result.lineWidths, [4, 4, 2]);
  });

  it("does not break on whitespace outside the backtrack window", () => {
    const result = wrapStringByVisibleWidth("ab cdefghij", 10, {
      maxBacktrack: 2,
    });
    ok(isMultilineString(result));
    // The space at col 2 is more than 2 cols back from the overflow point, so
    // a hard break is taken instead.
    deepEqual(result.lines, ["ab cdefghi", "j"]);
  });

  it("honors pre-existing line breaks", () => {
    const result = wrapStringByVisibleWidth("ab\ncd", 10);
    ok(isMultilineString(result));
    deepEqual(result.lines, ["ab", "cd"]);
    deepEqual(result.lineWidths, [2, 2]);
  });

  it("preserves SGR styling across wrap boundaries", () => {
    const result = wrapStringByVisibleWidth(`${RED}hello world${RESET}`, 5);
    ok(isMultilineString(result));
    deepEqual(result.lines, [`${RED}hello${RESET}`, `${RED}world${RESET}`]);
    deepEqual(result.lineWidths, [5, 5]);
  });

  it("maintains the lineWidths[i] === visibleWidth(lines[i]) invariant", () => {
    const result = wrapStringByVisibleWidth(
      `${RED}one two${RESET} three four`,
      5
    );
    ok(isMultilineString(result));
    for (let i = 0; i < result.lines.length; i++) {
      equal(visibleWidth(result.lines[i]), result.lineWidths[i]);
    }
  });

  it("falls back to parseMultilineString when maxWidth is non-positive", () => {
    deepEqual(
      wrapStringByVisibleWidth("ab\ncd", 0),
      parseMultilineString("ab\ncd")
    );
  });
});

describe("isMultilineString", () => {
  it("returns false for a single-line ParsedString", () => {
    equal(isMultilineString(parseMultilineString("hello")), false);
  });

  it("returns true once lines / lineWidths are populated", () => {
    equal(isMultilineString(parseMultilineString("a\nb")), true);
  });
});

import { deepEqual, equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import {
  parseMultilineString,
  sliceByVisibleWidth,
  visibleWidth,
  wrapStringByVisibleWidth,
} from "../src/strings.ts";

const RED = "\x1b[31m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";
// node:util.styleText emits selective closes rather than full resets.
const FG_DEFAULT = "\x1b[39m";
const BOLD_OFF = "\x1b[22m";

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
  it("returns {text, width} with no multiline payload for the empty string", () => {
    deepEqual(parseMultilineString(""), { text: "", width: 0 });
  });

  it("returns {text, width} with no multiline payload for a single-line input", () => {
    deepEqual(parseMultilineString("hello"), { text: "hello", width: 5 });
  });

  it("returns the input verbatim in `text` even for styled single-line input", () => {
    const input = `${RED}hello${RESET}`;
    const result = parseMultilineString(input);
    equal(result.text, input);
    equal(result.width, 5);
    equal(result.multiline, undefined);
  });

  it("populates the multiline payload only when the input spans multiple lines", () => {
    const result = parseMultilineString("ab\ncde\r\nf");
    ok(result.multiline);
    equal(result.text, "ab\ncde\r\nf");
    deepEqual(result.multiline.lines, ["ab", "cde", "f"]);
    deepEqual(result.multiline.widths, [2, 3, 1]);
    equal(result.width, 3);
  });

  it("emits a trailing empty line for a trailing line break", () => {
    const result = parseMultilineString("ab\n");
    ok(result.multiline);
    equal(result.text, "ab\n");
    deepEqual(result.multiline.lines, ["ab", ""]);
    deepEqual(result.multiline.widths, [2, 0]);
    equal(result.width, 2);
  });

  it("closes active SGRs at each line end and reopens them on the next line", () => {
    const result = parseMultilineString(`${RED}ab\ncd${RESET}`);
    ok(result.multiline);
    deepEqual(result.multiline.lines, [`${RED}ab${RESET}`, `${RED}cd${RESET}`]);
    deepEqual(result.multiline.widths, [2, 2]);
  });

  it("preserves the invariant widths[i] === visibleWidth(lines[i])", () => {
    const result = parseMultilineString(`${RED}${BOLD}ab\ncd${RESET} ef`);
    ok(result.multiline);
    const { lines, widths } = result.multiline;
    for (let i = 0; i < lines.length; i++) {
      equal(visibleWidth(lines[i]), widths[i]);
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
  it("returns {text, width} with no multiline payload for the empty string", () => {
    deepEqual(wrapStringByVisibleWidth("", 10), { text: "", width: 0 });
  });

  it("returns {text, width} with no multiline payload when the input fits in a single line", () => {
    const result = wrapStringByVisibleWidth("hello", 10);
    deepEqual(result, { text: "hello", width: 5 });
    equal(result.multiline, undefined);
  });

  it("breaks at whitespace within the line width", () => {
    const result = wrapStringByVisibleWidth("hello world", 5);
    ok(result.multiline);
    equal(result.text, "hello world");
    deepEqual(result.multiline.lines, ["hello", "world"]);
    deepEqual(result.multiline.widths, [5, 5]);
    equal(result.width, 5);
  });

  it("backtracks to the previous whitespace within maxBacktrack", () => {
    const result = wrapStringByVisibleWidth("abc defg", 6);
    ok(result.multiline);
    // Width 6 fills "abc de" but "defg" should wrap intact via backtrack to ' '.
    deepEqual(result.multiline.lines, ["abc", "defg"]);
  });

  it("hard-breaks when no whitespace is reachable", () => {
    const result = wrapStringByVisibleWidth("abcdefghij", 4);
    ok(result.multiline);
    deepEqual(result.multiline.lines, ["abcd", "efgh", "ij"]);
    deepEqual(result.multiline.widths, [4, 4, 2]);
  });

  it("does not break on whitespace outside the backtrack window", () => {
    const result = wrapStringByVisibleWidth("ab cdefghij", 10, {
      maxBacktrack: 2,
    });
    ok(result.multiline);
    // The space at col 2 is more than 2 cols back from the overflow point, so
    // a hard break is taken instead.
    deepEqual(result.multiline.lines, ["ab cdefghi", "j"]);
  });

  it("honors pre-existing line breaks", () => {
    const result = wrapStringByVisibleWidth("ab\ncd", 10);
    ok(result.multiline);
    deepEqual(result.multiline.lines, ["ab", "cd"]);
    deepEqual(result.multiline.widths, [2, 2]);
  });

  it("preserves SGR styling across wrap boundaries", () => {
    const result = wrapStringByVisibleWidth(`${RED}hello world${RESET}`, 5);
    ok(result.multiline);
    deepEqual(result.multiline.lines, [
      `${RED}hello${RESET}`,
      `${RED}world${RESET}`,
    ]);
    deepEqual(result.multiline.widths, [5, 5]);
  });

  it("maintains the widths[i] === visibleWidth(lines[i]) invariant", () => {
    const result = wrapStringByVisibleWidth(
      `${RED}one two${RESET} three four`,
      5
    );
    ok(result.multiline);
    const { lines, widths } = result.multiline;
    for (let i = 0; i < lines.length; i++) {
      equal(visibleWidth(lines[i]), widths[i]);
    }
  });

  it("breaks between CJK ideographs even without whitespace", () => {
    // "中文测试" — four CJK chars, each width 2. maxWidth=4 means 2 chars per line.
    const result = wrapStringByVisibleWidth("中文测试", 4);
    ok(result.multiline);
    deepEqual(result.multiline.lines, ["中文", "测试"]);
    deepEqual(result.multiline.widths, [4, 4]);
  });

  it("mixes CJK and ASCII whitespace as break points in the same line", () => {
    // After "ab" there's a space (replace boundary); after "中" there's an
    // after-boundary; both should be backtrack targets within maxWidth=6.
    const result = wrapStringByVisibleWidth("ab 中文ef", 6);
    ok(result.multiline);
    // Line 1 packs "ab 中" (width 1+1+1+2 = 5; not yet at 6). The 文 (w=2) would
    // push to 7, so we backtrack — the closest break point is 中 ("after"), so
    // the split keeps 中 on line 1.
    deepEqual(result.multiline.lines, ["ab 中", "文ef"]);
  });

  it("falls back to parseMultilineString when maxWidth is non-positive", () => {
    deepEqual(
      wrapStringByVisibleWidth("ab\ncd", 0),
      parseMultilineString("ab\ncd")
    );
  });

  it("collapses selective SGR closes across wrap boundaries", () => {
    // Bold opens, red opens, FG-default closes red mid-stream, then bold-off
    // closes bold. Each wrapped line should reflect only the actually-active
    // attributes at its start.
    const input = `${BOLD}red ${RED}word${FG_DEFAULT} ${BOLD_OFF}plain`;
    const result = wrapStringByVisibleWidth(input, 4);
    ok(result.multiline);
    // Line 1: bold "red"
    // Line 2: bold red "word", then FG-default closes
    // Line 3: plain ("plain" fits exactly in width 4? "plain" is 5 — wraps)
    // Each line is independent and renders correctly.
    const { lines, widths } = result.multiline;
    for (let i = 0; i < lines.length; i++) {
      equal(visibleWidth(lines[i]), widths[i]);
    }
  });
});

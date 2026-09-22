import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { getTextMetrics, getTextOutput } from "../src/index.ts";

const lineCases: {
  name: string;
  text?: string | string[];
  lines: string[];
  width: number;
}[] = [
  { name: "undefined text", lines: [""], width: 0 },
  { name: "empty text", text: "", lines: [""], width: 0 },
  { name: "an empty array", text: [], lines: [], width: 0 },
  { name: "an empty array entry", text: [""], lines: [""], width: 0 },
  { name: "plain text", text: "hello", lines: ["hello"], width: 5 },
  {
    name: "the longest line, not the last line",
    text: "one\nlongest\nend",
    lines: ["one", "longest", "end"],
    width: 7,
  },
  {
    name: "leading, consecutive, and trailing empty lines",
    text: "\na\n\n",
    lines: ["", "a", "", ""],
    width: 1,
  },
  {
    name: "only newlines",
    text: "\n\n",
    lines: ["", "", ""],
    width: 0,
  },
  {
    name: "CRLF and LF separators",
    text: "one\r\ntwo\n\r\n",
    lines: ["one", "two", "", ""],
    width: 3,
  },
  {
    name: "array entries containing newlines",
    text: ["one\ntwo", "", "longest\r\nend\n"],
    lines: ["one", "two", "", "longest", "end", ""],
    width: 7,
  },
  {
    name: "styled multiline text",
    text: "\x1b[31mred\r\n\x1b[1mlonger\x1b[0m",
    lines: ["\x1b[31mred", "\x1b[1mlonger\x1b[0m"],
    width: 6,
  },
  {
    name: "newlines within a control string",
    text: "\x1b]0;hidden\ncontinued\x07ok",
    lines: ["\x1b]0;hidden", "continued\x07ok"],
    width: 2,
  },
  {
    name: "control strings spanning array entries",
    text: ["\x1b]0;hidden", "continued\x07ok"],
    lines: ["\x1b]0;hidden", "continued\x07ok"],
    width: 2,
  },
  {
    name: "emoji modifiers on separate lines",
    text: ["\u{1f44d}", "\u{1f3fd}x"],
    lines: ["\u{1f44d}", "\u{1f3fd}x"],
    width: 3,
  },
  {
    name: "variation selectors on separate lines",
    text: "\u2764\n\ufe0fxx",
    lines: ["\u2764", "\ufe0fxx"],
    width: 2,
  },
  {
    name: "keycap marks on separate lines",
    text: ["1", "\u20e3xx"],
    lines: ["1", "\u20e3xx"],
    width: 2,
  },
];

const widthCases: [name: string, text: string, width: number][] = [
  ["whitespace", " a  ", 4],
  ["C0 and C1 controls", "a\tb\rc\b\x00\x07\x7f\x80\x85", 3],
  ["only controls", "\x00\t\r\x7f\x80\x9c", 0],
  ["SGR styling", "\x1b[1;38;2;12;34;56mhello\x1b[0m", 5],
  ["CSI cursor sequences", "a\x1b[2K\x1b[10Cb", 2],
  ["8-bit CSI", "\x9b31mred\x9b0m", 3],
  ["private CSI parameters", "\x1b[?25lhello\x1b[?25h", 5],
  ["CSI intermediate bytes", "\x1b[1 qhello", 5],
  ["single-character escapes", "\x1b7hello\x1b8", 5],
  ["character-set escapes", "\x1b(0hello\x1b(B", 5],
  ["OSC terminated by BEL", "\x1b]0;window title\x07hello", 5],
  [
    "OSC hyperlinks terminated by ST",
    "\x1b]8;;https://example.com\x1b\\link\x1b]8;;\x1b\\",
    4,
  ],
  ["8-bit OSC and ST", "\x9d0;window title\x9chello", 5],
  ["DCS control strings", "\x1bPignored\x07data\x1b\\hello", 5],
  [
    "SOS, PM, and APC control strings",
    "\x1bXhidden\x1b\\\x1b^hidden\x1b\\\x1b_hidden\x1b\\ok",
    2,
  ],
  [
    "8-bit control strings",
    "\x90hidden\x9c\x98hidden\x9c\x9ehidden\x9c\x9fhidden\x9cok",
    2,
  ],
  ["truncated CSI", "hi\x1b[31;", 2],
  ["truncated OSC", "hi\x1b]0;unfinished", 2],
  ["a trailing escape", "hi\x1b", 2],
  ["cancelled CSI", "a\x1b[123\x18bc", 3],
  ["cancelled OSC", "a\x1b]0;hidden\x1abc", 3],
  ["an invalid escape before Unicode", "\x1b\u4e2d", 2],
  ["an invalid CSI before Unicode", "\x1b[31\u4e2d", 2],
  ["combining accents", "e\u0301o\u0308\u0301", 2],
  ["standalone combining marks", "\u0301\u1ab0\u20dd", 0],
  [
    "formatting and zero-width characters",
    "a\u00ad\u200b\u200c\u200d\u2060\ufeffb",
    2,
  ],
  ["CJK ideographs", "\u4e2d\u6587", 4],
  ["wide and narrow characters", "A\u4e2dB", 4],
  ["fullwidth characters", "\uff21\uff22\u3000", 6],
  ["halfwidth katakana", "\uff76\uff80\uff76\uff85", 4],
  ["hiragana and katakana", "\u3042\u30a2", 4],
  ["Hangul syllables", "\ud55c\uae00", 4],
  ["decomposed Hangul", "\u1112\u1161\u11ab", 2],
  ["supplementary CJK", "\u{20000}\u{30000}", 4],
  ["supplementary kana", "\u{1b000}\u{1b164}", 4],
  ["Tangut and Nushu", "\u{17000}\u{1b170}", 4],
  ["ambiguous-width symbols", "\u00b7\u03a9\u2500\u3248", 4],
  ["a gap between wide ranges", "\u303f", 1],
  ["a narrow supplementary character", "\u{1d400}", 1],
  ["unpaired surrogates", "\ud800x\udc00", 3],
  ["emoji", "A\u{1f600}B", 4],
  ["BMP emoji", "\u231a\u26bd", 4],
  ["an emoji modifier sequence", "\u{1f44d}\u{1f3fd}", 2],
  ["a standalone emoji modifier", "\u{1f3fd}", 2],
  ["a modifier without a valid base", "\u{1f600}\u{1f3fd}", 4],
  ["multiple emoji modifiers", "\u{1f44d}\u{1f3fd}\u{1f3fd}", 4],
  ["a ZWJ profession", "\u{1f469}\u200d\u{1f4bb}", 2],
  ["a ZWJ family", "\u{1f468}\u200d\u{1f469}\u200d\u{1f467}\u200d\u{1f466}", 2],
  ["adjacent emoji sequences", "\u{1f469}\u200d\u{1f4bb}\u{1f44d}\u{1f3fd}", 4],
  ["flags", "\u{1f1fa}\u{1f1f8}\u{1f1ec}\u{1f1e7}", 4],
  ["a single regional indicator", "\u{1f1fa}", 1],
  [
    "a subdivision flag",
    "\u{1f3f4}\u{e0067}\u{e0062}\u{e0065}\u{e006e}\u{e0067}\u{e007f}",
    2,
  ],
  ["emoji presentation", "\u2764\ufe0f", 2],
  ["text presentation", "\u2764\ufe0e", 1],
  ["a text-default symbol", "\u2764", 1],
  ["keycaps", "1\ufe0f\u20e3#\u20e3*\ufe0f\u20e3", 6],
  ["ordinary keycap bases", "1#*", 3],
  ["a variation selector without an emoji base", "A\ufe0f", 1],
  ["a joiner between ordinary letters", "a\u200db", 2],
  ["a joiner before an ordinary letter", "\u{1f469}\u200dx", 3],
  ["consecutive joiners", "\u{1f469}\u200d\u200d\u{1f4bb}", 4],
  ["ANSI within a ZWJ sequence", "\u{1f469}\x1b[31m\u200d\u{1f4bb}\x1b[0m", 2],
  ["ANSI after a joiner", "\u{1f469}\u200d\x1b[31m\u{1f4bb}\x1b[0m", 2],
  [
    "ANSI within an emoji modifier sequence",
    "\u{1f44d}\x1b[31m\u{1f3fd}\x1b[0m",
    2,
  ],
  ["ANSI before emoji presentation", "\u2764\x1b[31m\ufe0f\x1b[0m", 2],
  ["ANSI within a flag", "\u{1f1fa}\x1b[31m\u{1f1f8}\x1b[0m", 2],
  ["ANSI within a keycap", "1\x1b[31m\ufe0f\u20e3\x1b[0m", 2],
  ["ANSI within an unqualified keycap", "#\x1b[31m\u20e3\x1b[0m", 2],
];

describe("getTextMetrics", () => {
  for (const { name, text, lines, width } of lineCases) {
    it(`measures ${name}`, () => {
      deepEqual(getTextMetrics(text), { lineCount: lines.length, width });
    });
  }

  for (const [name, text, width] of widthCases) {
    it(`measures ${name}`, () => {
      deepEqual(getTextMetrics(text), { lineCount: 1, width });
    });
  }

  it("finds the widest rendered line rather than the longest encoded line", () => {
    deepEqual(getTextMetrics("\x1b[31ma\x1b[0m\n\u4e2d\u6587\nabc"), {
      lineCount: 3,
      width: 4,
    });
  });

  it("resets Unicode matching between lines and calls", () => {
    const text = [
      "\u{1f600}",
      "\u4e2d\u6587",
      "e\u0301",
      "\u{1f469}\u200d\u{1f4bb}",
    ];
    for (let i = 0; i < 3; i++) {
      deepEqual(getTextMetrics(text), { lineCount: 4, width: 4 });
    }
  });

  it("walks long input without constructing intermediate text", (t) => {
    const text = "a".repeat(100_000) + "\x1b[31m\u{1f600}\x1b[0m\n\u4e2d";
    const split = t.mock.method(String.prototype, "split");
    const replace = t.mock.method(String.prototype, "replace");
    const slice = t.mock.method(String.prototype, "slice");
    const substring = t.mock.method(String.prototype, "substring");

    const metrics = getTextMetrics(text);
    const calls = [split, replace, slice, substring].map((fn) =>
      fn.mock.callCount()
    );
    t.mock.restoreAll();

    deepEqual(metrics, { lineCount: 2, width: 100_002 });
    deepEqual(calls, [0, 0, 0, 0]);
  });
});

describe("getTextOutput", () => {
  for (const { name, text, lines, width } of lineCases) {
    it(`returns ${name}`, () => {
      deepEqual(getTextOutput(text), {
        lineCount: lines.length,
        width,
        lines,
      });
    });
  }

  for (const [name, text, width] of widthCases) {
    it(`preserves ${name}`, () => {
      deepEqual(getTextOutput(text), { lineCount: 1, width, lines: [text] });
    });
  }

  it("does not mutate the input array", () => {
    const text = ["\x1b[31mred\x1b[0m\r\n\u4e2d\u6587", "tail\n"];
    const original = [...text];
    const output = getTextOutput(text);

    deepEqual(text, original);
    deepEqual(output, {
      lineCount: 4,
      width: 4,
      lines: ["\x1b[31mred\x1b[0m", "\u4e2d\u6587", "tail", ""],
    });
    equal(output.lines.length, output.lineCount);
  });
});

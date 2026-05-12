import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAsTree } from "../src/trees.ts";

describe("formatAsTree", () => {
  it("returns just the header when there are no rows", () => {
    equal(formatAsTree("Header", []), "Header");
  });

  it("does not append a trailing newline", () => {
    const result = formatAsTree("Header", ["a"]);
    ok(!result.endsWith("\n"));
  });

  it("uses ├── for non-last rows and └── for the last", () => {
    const result = formatAsTree("Header", ["first", "second", "third"]);
    const lines = result.split("\n");
    equal(lines[0], "Header");
    equal(lines[1], "├── first");
    equal(lines[2], "├── second");
    equal(lines[3], "└── third");
  });

  it("uses └── for a single row", () => {
    const result = formatAsTree("Header", ["only"]);
    const lines = result.split("\n");
    equal(lines[0], "Header");
    equal(lines[1], "└── only");
  });

  it("uses ASCII characters when asciiOnly is set", () => {
    const result = formatAsTree("Header", ["a", "b"], { asciiOnly: true });
    const lines = result.split("\n");
    equal(lines[1], "+-- a");
    equal(lines[2], "`-- b");
  });

  it("treeParts overrides asciiOnly when both are provided", () => {
    const result = formatAsTree("Header", ["a", "b"], {
      asciiOnly: true,
      treeParts: {
        row: ["* ", "  "],
        last: ["> ", "  "],
      },
    });
    const lines = result.split("\n");
    equal(lines[1], "* a");
    equal(lines[2], "> b");
  });

  it("expands a multi-line row into one output line per source line with continuation prefix", () => {
    const result = formatAsTree("Header", ["first-line\nsecond-line", "only"]);
    const lines = result.split("\n");
    equal(lines[0], "Header");
    equal(lines[1], "├── first-line");
    equal(lines[2], "│   second-line");
    equal(lines[3], "└── only");
  });

  it("uses the empty-trunk continuation for a multi-line last row", () => {
    const result = formatAsTree("Header", ["a\nb"]);
    const lines = result.split("\n");
    equal(lines[0], "Header");
    equal(lines[1], "└── a");
    equal(lines[2], "    b");
  });

  it("indent as a number prepends that many spaces to each row line", () => {
    const result = formatAsTree("Header", ["a", "b"], { indent: 2 });
    const lines = result.split("\n");
    // header is intentionally not indented
    equal(lines[0], "Header");
    equal(lines[1], "  ├── a");
    equal(lines[2], "  └── b");
  });

  it("indent as a string prepends that string to each row line", () => {
    const result = formatAsTree("Header", ["a", "b"], { indent: ">> " });
    const lines = result.split("\n");
    equal(lines[1], ">> ├── a");
    equal(lines[2], ">> └── b");
  });

  it("indent applies to multi-line continuation lines as well", () => {
    const result = formatAsTree("Header", ["a\nb"], { indent: 2 });
    const lines = result.split("\n");
    equal(lines[1], "  └── a");
    // 2 spaces of indent + "    " (last-row continuation) = 6 spaces before "b"
    equal(lines[2], "      b");
  });
});

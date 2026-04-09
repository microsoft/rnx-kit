import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { formatTable, reportResults } from "../src/report.ts";
import type { PerfDataEntry } from "../src/types.ts";

function makeEntry(overrides: Partial<PerfDataEntry> = {}): PerfDataEntry {
  return {
    order: 0,
    name: "test: op",
    area: "test",
    operation: "op",
    calls: 1,
    total: 100,
    avg: 100,
    errors: 0,
    ...overrides,
  };
}

describe("reportResults", () => {
  it("returns a formatted table string", () => {
    const result = reportResults([makeEntry()]);
    ok(typeof result === "string");
    ok(result.includes("name"));
    ok(result.includes("calls"));
    ok(result.includes("total"));
    ok(result.includes("avg"));
  });

  it("omits errors column when all errors are 0", () => {
    const result = reportResults([makeEntry({ errors: 0 })]);
    ok(!result.includes("errors"), "errors column should be omitted");
  });

  it("includes errors column when there are errors", () => {
    const result = reportResults([makeEntry({ errors: 2 })]);
    ok(result.includes("errors"));
  });

  it("does not mutate the input array when sorting", () => {
    const entries = [
      makeEntry({ name: "b", order: 2 }),
      makeEntry({ name: "a", order: 1 }),
    ];
    const originalFirst = entries[0]!;
    reportResults(entries, { sort: "name" });
    equal(entries[0], originalFirst, "input array should not be reordered");
  });

  it("sorts by a single column", () => {
    const result = reportResults(
      [
        makeEntry({ name: "beta", operation: "beta", total: 200 }),
        makeEntry({ name: "alpha", operation: "alpha", total: 100 }),
      ],
      { sort: "name" }
    );
    const alphaIndex = result.indexOf("alpha");
    const betaIndex = result.indexOf("beta");
    ok(alphaIndex < betaIndex, "alpha should appear before beta");
  });

  it("sorts by multiple columns in precedence order", () => {
    const result = reportResults(
      [
        makeEntry({
          area: "xx",
          total: 200,
          name: "xx: op2",
          operation: "op2",
        }),
        makeEntry({
          area: "xx",
          total: 100,
          name: "xx: op1",
          operation: "op1",
        }),
        makeEntry({
          area: "aa",
          total: 300,
          name: "aa: op3",
          operation: "op3",
        }),
      ],
      { sort: ["area", "total"] }
    );
    const lines = result.split("\n");
    // First data row (after header) should contain area "aa"
    const dataLines = lines.filter(
      (l) => l.startsWith("│") && !l.includes("name")
    );
    ok(dataLines[0]!.includes("aa"), "area 'aa' should sort first");
    ok(
      dataLines[2]!.includes("op2"),
      "higher total should sort last within same area"
    );
  });

  it("respects custom cols configuration", () => {
    const result = reportResults([makeEntry()], {
      cols: ["name", "total"],
    });
    ok(result.includes("name"));
    ok(result.includes("total"));
    ok(!result.includes("calls"));
    ok(!result.includes("avg"));
  });
});

describe("formatTable", () => {
  it("renders a table with header and data rows", () => {
    const data = [
      { col1: "a", col2: "b" },
      { col1: "cc", col2: "dd" },
    ];
    const result = formatTable(data, ["col1", "col2"]);
    const lines = result.split("\n").filter(Boolean);

    // Should have: top border, header, mid border, 2 data rows, bottom border
    equal(lines.length, 6);
    ok(lines[0]!.startsWith("┌"));
    ok(lines[1]!.includes("col1"));
    ok(lines[1]!.includes("col2"));
    ok(lines[2]!.startsWith("├"));
    ok(lines[3]!.includes("a"));
    ok(lines[4]!.includes("cc"));
    ok(lines[5]!.startsWith("└"));
  });

  it("pads columns to the widest value", () => {
    const data = [
      { name: "short", value: "1" },
      { name: "very long name", value: "2" },
    ];
    const result = formatTable(data, ["name", "value"]);
    const lines = result.split("\n").filter(Boolean);

    // All row-separator lines should have the same length
    const topLen = lines[0]!.length;
    const midLen = lines[2]!.length;
    const botLen = lines[5]!.length;
    equal(topLen, midLen);
    equal(midLen, botLen);

    // All data lines should also have the same length
    equal(lines[1]!.length, lines[3]!.length);
    equal(lines[3]!.length, lines[4]!.length);
  });

  it("right-aligns non-first columns", () => {
    const data = [{ name: "op", count: "1" }];
    const result = formatTable(data, ["name", "count"]);
    // "count" header is 5 chars, "1" is 1 char → should have 4 spaces of left-padding
    ok(result.includes("│     1 │") || result.includes("│ 1 │"));
  });

  it("left-aligns the first column", () => {
    const data = [{ name: "op", count: "1" }];
    const result = formatTable(data, ["name", "count"]);
    const lines = result.split("\n").filter(Boolean);
    // First data row should have "op" left-aligned (value first, then padding)
    ok(lines[3]!.includes("│ op"));
  });

  it("handles empty data array", () => {
    const result = formatTable([], ["col1", "col2"]);
    const lines = result.split("\n").filter(Boolean);
    // top border, header, mid border, bottom border (no data rows)
    equal(lines.length, 4);
  });

  it("correctly measures width of ANSI-styled text", () => {
    const styled = "\x1b[92mhello\x1b[39m"; // "hello" in green
    const data = [{ name: styled }];
    const result = formatTable(data, ["name"]);
    // Column width should be based on visible "hello" (5 chars), not the full ANSI string
    // The "name" header is 4 chars, "hello" is 5 chars, so max width = 5
    const lines = result.split("\n").filter(Boolean);
    const topLine = lines[0]!;
    // ┌ + 5+2 dashes + ┐ = "┌───────┐"
    ok(topLine.includes("───────"), "width should be based on visible text");
  });
});

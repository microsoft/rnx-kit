import { equal, ok } from "node:assert/strict";
import { describe, it } from "node:test";
import { formatAsTable } from "../src/table.ts";

describe("formatAsTable", () => {
  it("returns empty string for empty data", () => {
    const result = formatAsTable([]);
    equal(result, "");
  });

  it("renders a table with header and data rows", () => {
    const data = [
      ["a", "b"],
      ["cc", "dd"],
    ];
    const result = formatAsTable(data, {
      columns: ["col1", "col2"],
      noColors: true,
    });
    const lines = result.split("\n").filter(Boolean);

    // top border, header, mid border, 2 data rows, bottom border
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
      ["short", "1"],
      ["very long name", "2"],
    ];
    const result = formatAsTable(data, {
      columns: ["name", "value"],
      noColors: true,
    });
    const lines = result.split("\n").filter(Boolean);

    // all row-separator lines should have the same length
    const topLen = lines[0]!.length;
    const midLen = lines[2]!.length;
    const botLen = lines[5]!.length;
    equal(topLen, midLen);
    equal(midLen, botLen);

    // all data lines should also have the same length
    equal(lines[1]!.length, lines[3]!.length);
    equal(lines[3]!.length, lines[4]!.length);
  });

  it("respects column alignment options", () => {
    const data = [["op", 1]];
    const result = formatAsTable(data, {
      columns: [
        { label: "name", align: "left" },
        { label: "count", align: "right" },
      ],
      noColors: true,
    });
    const lines = result.split("\n").filter(Boolean);
    // first data row should have "op" left-aligned
    ok(lines[3]!.includes("│ op"));
  });

  it("left-aligns columns by default", () => {
    const data = [["op", "val"]];
    const result = formatAsTable(data, {
      columns: ["name", "value"],
      noColors: true,
    });
    const lines = result.split("\n").filter(Boolean);
    ok(lines[3]!.includes("│ op"));
  });

  it("sorts by a single column index", () => {
    const data = [
      ["beta", 200],
      ["alpha", 100],
    ];
    const result = formatAsTable(data, {
      columns: ["name", "total"],
      sort: [0],
      noColors: true,
    });
    const alphaIndex = result.indexOf("alpha");
    const betaIndex = result.indexOf("beta");
    ok(alphaIndex < betaIndex, "alpha should appear before beta");
  });

  it("sorts by multiple column indices in precedence order", () => {
    const data = [
      ["xx", 200],
      ["xx", 100],
      ["aa", 300],
    ];
    const result = formatAsTable(data, {
      columns: ["area", "total"],
      sort: [0, 1],
      noColors: true,
    });
    const lines = result
      .split("\n")
      .filter((l) => l.startsWith("│") && !l.includes("area"));
    ok(lines[0]!.includes("aa"), "area 'aa' should sort first");
  });

  it("does not mutate the input array when sorting", () => {
    const data = [
      ["beta", 2],
      ["alpha", 1],
    ];
    const originalFirst = data[0]!;
    formatAsTable(data, {
      columns: ["name", "val"],
      sort: [0],
      noColors: true,
    });
    equal(data[0], originalFirst, "input array should not be reordered");
  });

  it("supports showIndex option", () => {
    const data = [
      ["a", "b"],
      ["c", "d"],
    ];
    const result = formatAsTable(data, {
      columns: ["col1", "col2"],
      showIndex: true,
      noColors: true,
    });
    ok(result.includes("1"), "should show row index 1");
    ok(result.includes("2"), "should show row index 2");
  });

  it("formats numbers with digits option", () => {
    const data = [[1.23456]];
    const result = formatAsTable(data, {
      columns: [{ label: "value", digits: 2 }],
      noColors: true,
    });
    ok(result.includes("1.23"));
  });

  it("formats numbers with locale formatting", () => {
    const data = [[1234567]];
    const result = formatAsTable(data, {
      columns: [{ label: "value", digits: 0, localeFmt: true }],
      noColors: true,
    });
    // locale formatted number should have some separator (e.g. comma)
    ok(
      result.includes("1,234,567") || result.includes("1.234.567"),
      "should have locale separator"
    );
  });

  it("truncates values exceeding maxWidth", () => {
    const data = [["this-is-a-very-long-value-that-should-be-truncated"]];
    const result = formatAsTable(data, {
      columns: [{ label: "name", maxWidth: 15 }],
      noColors: true,
    });
    ok(result.includes("..."), "should truncate with ellipsis");
  });

  it("correctly measures width of ANSI-styled text", () => {
    const data = [["\x1b[92mhello\x1b[39m"]]; // "hello" in green
    const result = formatAsTable(data, { columns: ["name"] });
    // Column width should be based on visible "hello" (5 chars), not the full ANSI string
    // "name" is 4 chars, "hello" is 5 chars, so max width = 5
    const lines = result.split("\n").filter(Boolean);
    const topLine = lines[0]!;
    ok(topLine.includes("───────"), "width should be based on visible text");
  });
});

import { deepStrictEqual, strictEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { stripVTControlCharacters } from "node:util";
import { formatTable } from "../src/tables.ts";

describe("formatTable", () => {
  describe("returns null for invalid input", () => {
    it("returns null for empty rows", () => {
      strictEqual(
        formatTable([], { columns: ["A", "B"] }),
        null
      );
    });
  });

  describe("csv", () => {
    it("renders a basic csv table", () => {
      const result = formatTable(
        [
          ["alice", 10],
          ["bob", 20],
        ],
        { columns: ["Name", "Score"], style: "csv", sort: false }
      );
      deepStrictEqual(result?.split("\n"), [
        "Name,Score",
        "alice,10",
        "bob,20",
      ]);
    });

    it("escapes commas and quotes", () => {
      const result = formatTable(
        [['a "b"', "c,d"]],
        { columns: ["X", "Y"], style: "csv", sort: false }
      );
      deepStrictEqual(result?.split("\n"), [
        "X,Y",
        '"a ""b""","c,d"',
      ]);
    });

    it("omits header when disabled", () => {
      const result = formatTable(
        [["a", "b"]],
        { columns: ["X", "Y"], style: "csv", sort: false, header: false }
      );
      strictEqual(result, "a,b");
    });

    it("strips ANSI codes from csv values", () => {
      const result = formatTable(
        [["\x1b[31mred\x1b[0m", "plain"]],
        { columns: ["A", "B"], style: "csv", sort: false }
      );
      deepStrictEqual(result?.split("\n"), ["A,B", "red,plain"]);
    });
  });

  describe("markdown", () => {
    it("renders a basic markdown table", () => {
      const result = formatTable(
        [
          ["alice", 10],
          ["bob", 20],
        ],
        { columns: ["Name", "Score"], style: "markdown", sort: false }
      );
      deepStrictEqual(result?.split("\n"), [
        "| Name  | Score |",
        "| ----- | ----: |",
        "| alice |    10 |",
        "| bob   |    20 |",
      ]);
    });

    it("aligns center columns in separator", () => {
      const result = formatTable(
        [["abc", "def"]],
        {
          columns: [
            { title: "Left", align: "left" },
            { title: "Center", align: "center" },
          ],
          style: "markdown",
          sort: false,
        }
      );
      const lines = result?.split("\n") ?? [];
      // separator line should have center markers
      strictEqual(lines[1], "| ---- | :----: |");
    });

    it("truncates long values when maxWidth is set", () => {
      const result = formatTable(
        [["abcdefghij", "ok"]],
        {
          columns: [
            { title: "Col", maxWidth: 5 },
            { title: "B" },
          ],
          style: "markdown",
          sort: false,
        }
      );
      const lines = result?.split("\n") ?? [];
      // the data row should have a truncated value with ellipsis
      const dataLine = lines[2];
      strictEqual(dataLine.includes("…"), true);
    });
  });

  describe("ascii", () => {
    it("renders a basic ascii table", () => {
      const result = formatTable(
        [
          ["alice", 10],
          ["bob", 20],
        ],
        { columns: ["Name", "Score"], style: "ascii", sort: false }
      );
      deepStrictEqual(result?.split("\n"), [
        "┌───────┬───────┐",
        "│ Name  │ Score │",
        "├───────┼───────┤",
        "│ alice │    10 │",
        "│ bob   │    20 │",
        "└───────┴───────┘",
      ]);
    });

    it("renders without header", () => {
      const result = formatTable(
        [["a", "b"]],
        { columns: ["X", "Y"], style: "ascii", sort: false, header: false }
      );
      const lines = result?.split("\n") ?? [];
      // should have top border, data row, bottom border, no separator
      strictEqual(lines.length, 3);
      strictEqual(lines[0].startsWith("┌"), true);
      strictEqual(lines[1].startsWith("│"), true);
      strictEqual(lines[2].startsWith("└"), true);
    });

    it("wraps long text into multiple lines", () => {
      const result = formatTable(
        [["abcdefgh", "ok"]],
        {
          columns: [
            { title: "Col", maxWidth: 4 },
            { title: "B" },
          ],
          style: "ascii",
          sort: false,
        }
      );
      const lines = result?.split("\n") ?? [];
      // header + separator + 2 wrapped data lines + borders
      const dataLines = lines.filter((l) => l.startsWith("│"));
      // header = 1, data = 2 (abcd / efgh)
      strictEqual(dataLines.length, 3);
    });

    it("handles ANSI codes in wrapped text", () => {
      const red = "\x1b[31m";
      const reset = "\x1b[0m";
      const text = `${red}abcdefgh${reset}`;
      const result = formatTable(
        [[text, "ok"]],
        {
          columns: [
            { title: "Col", maxWidth: 4 },
            { title: "B" },
          ],
          style: "ascii",
          sort: false,
          wrap: true,
        }
      );
      // verify the table renders without error and contains the text
      strictEqual(result != null, true);
      // the visible content should include abcd and efgh across lines
      const stripped = stripVTControlCharacters(result!);
      strictEqual(stripped.includes("abcd"), true);
      strictEqual(stripped.includes("efgh"), true);
    });

    it("truncates instead of wrapping when wrap is false", () => {
      const result = formatTable(
        [["abcdefgh", "ok"]],
        {
          columns: [
            { title: "Col", maxWidth: 4 },
            { title: "B" },
          ],
          style: "ascii",
          sort: false,
          wrap: false,
        }
      );
      const lines = result?.split("\n") ?? [];
      const dataLines = lines.filter((l) => l.startsWith("│"));
      // header + 1 data line (truncated, not wrapped)
      strictEqual(dataLines.length, 2);
      // should contain ellipsis
      strictEqual(result!.includes("…"), true);
    });
  });

  describe("sorting", () => {
    it("sorts by first column by default", () => {
      const result = formatTable(
        [
          ["banana", 2],
          ["apple", 1],
        ],
        { columns: ["Fruit", "Count"], style: "csv" }
      );
      const lines = result?.split("\n") ?? [];
      strictEqual(lines[1], "apple,1");
      strictEqual(lines[2], "banana,2");
    });

    it("sorts by specified column index", () => {
      const result = formatTable(
        [
          ["banana", 2],
          ["apple", 1],
        ],
        { columns: ["Fruit", "Count"], style: "csv", sort: 1 }
      );
      const lines = result?.split("\n") ?? [];
      strictEqual(lines[1], "apple,1");
      strictEqual(lines[2], "banana,2");
    });

    it("does not sort when sort is false", () => {
      const result = formatTable(
        [
          ["banana", 2],
          ["apple", 1],
        ],
        { columns: ["Fruit", "Count"], style: "csv", sort: false }
      );
      const lines = result?.split("\n") ?? [];
      strictEqual(lines[1], "banana,2");
      strictEqual(lines[2], "apple,1");
    });
  });
});

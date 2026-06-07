import { deepEqual, equal, notEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { styleText as nodeStyleText } from "node:util";
import {
  colorText as styleText,
  compareSeverity,
  formatConsoleFileMessage,
  formatConsoleMessage,
} from "../src/messages.ts";
import type { Severity } from "../src/types.ts";

describe("messages", () => {
  describe("formatConsoleMessage", () => {
    it("formats messages without colors", () => {
      equal(
        formatConsoleMessage("error", "message", { noColors: true }),
        "error: message"
      );
    });

    it("formats messages with colors", () => {
      equal(
        formatConsoleMessage("warn", "message", { noColors: false }),
        `${nodeStyleText("yellow", "warn")}: message`
      );
    });

    it("passes unknown severities through", () => {
      equal(
        formatConsoleMessage("debug" as Severity, "message", {
          noColors: true,
        }),
        "message"
      );
    });
  });

  describe("formatConsoleFileMessage", () => {
    const root = "/repo";
    const file = "/repo/src/file.ts";

    it("formats file-only messages", () => {
      equal(
        formatConsoleFileMessage(
          "info",
          { message: "message", file, root },
          { noColors: true }
        ),
        "info: src/file.ts: message"
      );
    });

    it("formats file and line messages", () => {
      equal(
        formatConsoleFileMessage(
          "info",
          { message: "message", file, root, line: 10 },
          { noColors: true }
        ),
        "info: src/file.ts:10: message"
      );
    });

    it("formats file, line, and column messages", () => {
      equal(
        formatConsoleFileMessage(
          "info",
          { message: "message", file, root, line: 10, col: 2 },
          { noColors: true }
        ),
        "info: src/file.ts:10:2: message"
      );
    });

    it("formats titled messages and ignores end positions", () => {
      equal(
        formatConsoleFileMessage(
          "info",
          {
            message: "message",
            file,
            root,
            line: 10,
            col: 2,
            endLine: 12,
            endCol: 4,
            title: "Title",
          },
          { noColors: true }
        ),
        "info: src/file.ts:10:2: [Title] message"
      );
    });
  });

  describe("compareSeverity", () => {
    it("compares all severity pairs", () => {
      const severities: Severity[] = ["info", "warn", "error"];
      const results = severities.map((a) =>
        severities.map((b) => Math.sign(compareSeverity(a, b)))
      );
      deepEqual(results, [
        [0, -1, -1],
        [1, 0, -1],
        [1, 1, 0],
      ]);
    });
  });

  describe("styleText", () => {
    it("respects noColors", () => {
      equal(styleText("red", "message", { noColors: true }), "message");
    });

    it("applies styles when colors are enabled", () => {
      const styled = styleText("red", "message", { noColors: false });
      equal(styled, nodeStyleText("red", "message"));
      notEqual(styled, "");
    });
  });
});

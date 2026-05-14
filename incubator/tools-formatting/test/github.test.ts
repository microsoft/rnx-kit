import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { createGitHubReporter } from "../src/github.ts";

const reporter = createGitHubReporter();

describe("GitHubReporter", () => {
  describe("formatMessage", () => {
    it("formats every severity", () => {
      deepEqual(
        [
          reporter.formatMessage("error", "message"),
          reporter.formatMessage("warn", "message"),
          reporter.formatMessage("info", "message"),
        ],
        ["::error::message", "::warning::message", "::notice::message"]
      );
    });

    it("escapes data", () => {
      equal(
        reporter.formatMessage("error", "100%\r\nmessage"),
        "::error::100%25%0D%0Amessage"
      );
    });
  });

  describe("formatFileMessage", () => {
    const root = "/repo";
    const file = "/repo/src/file.ts";

    it("formats a file-only annotation", () => {
      equal(
        reporter.formatFileMessage("error", { message: "message", file, root }),
        "::error file=src/file.ts::message"
      );
    });

    it("formats a file and line annotation", () => {
      equal(
        reporter.formatFileMessage("warn", {
          message: "message",
          file,
          root,
          line: 10,
        }),
        "::warning file=src/file.ts,line=10::message"
      );
    });

    it("formats a file, line, and column annotation", () => {
      equal(
        reporter.formatFileMessage("info", {
          message: "message",
          file,
          root,
          line: 10,
          col: 2,
        }),
        "::notice file=src/file.ts,line=10,col=2::message"
      );
    });

    it("formats all supported GitHub annotation properties", () => {
      equal(
        reporter.formatFileMessage("error", {
          message: "message",
          file,
          root,
          line: 10,
          col: 2,
          endLine: 12,
          endCol: 4,
          title: "Title",
        }),
        "::error file=src/file.ts,line=10,col=2,endLine=12,endColumn=4,title=Title::message"
      );
    });

    it("escapes data and properties", () => {
      equal(
        reporter.formatFileMessage("error", {
          message: "100%\r\nmessage",
          file: "/repo/src/a:b,c.ts",
          root,
          title: "a:b,c",
        }),
        "::error file=src/a%3Ab%2Cc.ts,title=a%3Ab%2Cc::100%25%0D%0Amessage"
      );
    });
  });

  describe("formatGroup", () => {
    it("escapes special characters in the header", () => {
      equal(
        reporter.formatGroup("100%\r\nheader", ["a", "b"]),
        "::group::100%25%0D%0Aheader\na\nb\n::endgroup::"
      );
    });
  });
});

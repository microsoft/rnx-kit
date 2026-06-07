import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { createAzureFormatter } from "../src/azure.ts";

const formatter = createAzureFormatter();

describe("AzureFormatter", () => {
  describe("formatMessage", () => {
    it("formats error and warning as Azure log issues", () => {
      deepEqual(
        [
          formatter.formatMessage("error", "message"),
          formatter.formatMessage("warn", "message"),
        ],
        [
          "##vso[task.logissue type=error]message",
          "##vso[task.logissue type=warning]message",
        ]
      );
    });

    it("formats info as a console message", () => {
      equal(formatter.formatMessage("info", "message"), "info: message");
    });

    it("escapes Azure data", () => {
      equal(
        formatter.formatMessage("error", "100%\r\nmessage"),
        "##vso[task.logissue type=error]100%AZP25%0D%0Amessage"
      );
    });
  });

  describe("formatFileMessage", () => {
    const root = "/repo";
    const file = "/repo/src/file.ts";

    it("formats a file-only annotation", () => {
      equal(
        formatter.formatFileMessage("error", {
          message: "message",
          file,
          root,
        }),
        "##vso[task.logissue type=error;sourcepath=src/file.ts]message"
      );
    });

    it("formats a file and line annotation", () => {
      equal(
        formatter.formatFileMessage("warn", {
          message: "message",
          file,
          root,
          line: 10,
        }),
        "##vso[task.logissue type=warning;sourcepath=src/file.ts;linenumber=10]message"
      );
    });

    it("formats a file, line, and column annotation", () => {
      equal(
        formatter.formatFileMessage("error", {
          message: "message",
          file,
          root,
          line: 10,
          col: 2,
        }),
        "##vso[task.logissue type=error;sourcepath=src/file.ts;linenumber=10;columnnumber=2]message"
      );
    });

    it("ignores end location and title properties", () => {
      equal(
        formatter.formatFileMessage("error", {
          message: "message",
          file,
          root,
          line: 10,
          col: 2,
          endLine: 12,
          endCol: 4,
          title: "Title",
        }),
        "##vso[task.logissue type=error;sourcepath=src/file.ts;linenumber=10;columnnumber=2]message"
      );
    });

    it("escapes Azure data and properties", () => {
      equal(
        formatter.formatFileMessage("error", {
          message: "100%\r\nmessage]",
          file: "/repo/src/a;b].ts",
          root,
        }),
        "##vso[task.logissue type=error;sourcepath=src/a%3Bb%5D.ts]100%AZP25%0D%0Amessage]"
      );
    });
  });

  describe("formatGroup", () => {
    it("escapes special characters in the header", () => {
      equal(
        formatter.formatGroup("100%\r\nheader", ["a", "b"]),
        "##[group]100%AZP25%0D%0Aheader\na\nb\n##[endgroup]"
      );
    });
  });
});

import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { formatFileMessage, formatGroup, formatMessage } from "../src/core.ts";
import { getDefaultFormatter } from "../src/formatters.ts";
import type { FileMessage, Formatter, Severity } from "../src/types.ts";

const customFormatter: Formatter = {
  name: "custom",
  noColors: true,
  asciiOnly: true,
  formatMessage: (severity: Severity, message: string) =>
    `message:${severity}:${message}`,
  formatFileMessage: (severity: Severity, fileMessage: FileMessage) =>
    `file:${severity}:${fileMessage.file}:${fileMessage.message}`,
  formatGroup: (header: string, children: string[]) =>
    `group:${header}:${children.join("|")}`,
};

describe("core", () => {
  it("dispatches to the default formatter when no formatter is provided", () => {
    const formatter = getDefaultFormatter();
    const fileMessage = { message: "message", file: "src/file.ts", root: "" };

    equal(
      formatMessage("info", "message"),
      formatter.formatMessage("info", "message")
    );
    equal(
      formatFileMessage("info", fileMessage),
      formatter.formatFileMessage("info", fileMessage)
    );
    equal(
      formatGroup("Header", ["a", "b"]),
      formatter.formatGroup("Header", ["a", "b"])
    );
  });

  it("dispatches to a built-in formatter by name", () => {
    deepEqual(
      [
        formatMessage("error", "message", "azure"),
        formatFileMessage(
          "error",
          { message: "message", file: "/repo/src/file.ts", root: "/repo" },
          "azure"
        ),
        formatGroup("Header", ["message"], "azure"),
      ],
      [
        "##vso[task.logissue type=error]message",
        "##vso[task.logissue type=error;sourcepath=src/file.ts]message",
        "##[group]Header\nmessage\n##[endgroup]",
      ]
    );
  });

  it("dispatches to a custom formatter instance", () => {
    deepEqual(
      [
        formatMessage("warn", "message", customFormatter),
        formatFileMessage(
          "warn",
          { message: "message", file: "src/file.ts" },
          customFormatter
        ),
        formatGroup("Header", ["a", "b"], customFormatter),
      ],
      [
        "message:warn:message",
        "file:warn:src/file.ts:message",
        "group:Header:a|b",
      ]
    );
  });
});

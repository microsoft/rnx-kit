import { deepEqual, equal } from "node:assert/strict";
import { describe, it } from "node:test";
import { formatFileMessage, formatGroup, formatMessage } from "../src/core.ts";
import { getDefaultReporter } from "../src/reporters.ts";
import type { FileMessage, Reporter, Severity } from "../src/types.ts";

const customReporter: Reporter = {
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
  it("dispatches to the default reporter when no reporter is provided", () => {
    const reporter = getDefaultReporter();
    const fileMessage = { message: "message", file: "src/file.ts", root: "" };

    equal(
      formatMessage("info", "message"),
      reporter.formatMessage("info", "message")
    );
    equal(
      formatFileMessage("info", fileMessage),
      reporter.formatFileMessage("info", fileMessage)
    );
    equal(
      formatGroup("Header", ["a", "b"]),
      reporter.formatGroup("Header", ["a", "b"])
    );
  });

  it("dispatches to a built-in reporter by name", () => {
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

  it("dispatches to a custom reporter instance", () => {
    deepEqual(
      [
        formatMessage("warn", "message", customReporter),
        formatFileMessage(
          "warn",
          { message: "message", file: "src/file.ts" },
          customReporter
        ),
        formatGroup("Header", ["a", "b"], customReporter),
      ],
      [
        "message:warn:message",
        "file:warn:src/file.ts:message",
        "group:Header:a|b",
      ]
    );
  });
});

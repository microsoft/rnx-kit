import { deepEqual } from "node:assert/strict";
import { describe, it } from "node:test";
import { MAX_LINE_LENGTH } from "../src/constants";
import { lint } from "../src/index";

describe("Lint commit message", () => {
  it("should fail non-conforming messages", () => {
    deepEqual(lint(""), ["empty"]);
    deepEqual(lint("fix"), ["format"]);
    deepEqual(lint("foo:"), ["type", "title"]);
    deepEqual(lint("Fix:"), ["type-case", "title"]);
    deepEqual(lint("fix:"), ["title"]);
    deepEqual(lint("fix: "), ["title"]);
    deepEqual(lint("fix():"), ["scope", "title"]);
    deepEqual(lint("fix(): "), ["scope", "title"]);
    deepEqual(lint("fix(Scope): "), ["scope-case", "title"]);
    deepEqual(lint("fix:title"), ["space-after-colon"]);
    deepEqual(lint("fix: title\nbody"), ["paragraph"]);
    deepEqual(lint("fix():title\nbody"), [
      "scope",
      "space-after-colon",
      "paragraph",
    ]);
    deepEqual(lint(`fix: title\n\n${"x".repeat(MAX_LINE_LENGTH + 1)}`), [
      "body-line-length",
    ]);
  });

  it("should pass conforming messages", () => {
    deepEqual(lint("fix: title\n\nbody"), []);
    deepEqual(lint("fix(scope): title\n\nbody"), []);
    deepEqual(lint("fix!: title\n\nbody"), []);
    deepEqual(lint("fix(scope)!: title\n\nbody"), []);
    deepEqual(lint(`fix: title\n\n${"x".repeat(MAX_LINE_LENGTH)}`), []);
  });
});

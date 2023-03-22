import { MAX_LINE_LENGTH } from "../src/constants";
import { lint } from "../src/index";

describe("Lint commit message", () => {
  it("should fail non-conforming messages", () => {
    expect(lint("")).toEqual(["empty"]);
    expect(lint("fix")).toEqual(["format"]);
    expect(lint("foo:")).toEqual(["type", "title"]);
    expect(lint("Fix:")).toEqual(["type-case", "title"]);
    expect(lint("fix:")).toEqual(["title"]);
    expect(lint("fix: ")).toEqual(["title"]);
    expect(lint("fix():")).toEqual(["scope", "title"]);
    expect(lint("fix(): ")).toEqual(["scope", "title"]);
    expect(lint("fix(Scope): ")).toEqual(["scope-case", "title"]);
    expect(lint("fix:title")).toEqual(["space-after-colon"]);
    expect(lint("fix: title\nbody")).toEqual(["paragraph"]);
    expect(lint("fix():title\nbody")).toEqual([
      "scope",
      "space-after-colon",
      "paragraph",
    ]);
    expect(lint(`fix: title\n\n${"x".repeat(MAX_LINE_LENGTH + 1)}`)).toEqual([
      "body-line-length",
    ]);
  });

  it("should pass conforming messages", () => {
    expect(lint("fix: title\n\nbody")).toEqual([]);
    expect(lint("fix(scope): title\n\nbody")).toEqual([]);
    expect(lint("fix!: title\n\nbody")).toEqual([]);
    expect(lint("fix(scope)!: title\n\nbody")).toEqual([]);
    expect(lint(`fix: title\n\n${"x".repeat(MAX_LINE_LENGTH)}`)).toEqual([]);
  });
});

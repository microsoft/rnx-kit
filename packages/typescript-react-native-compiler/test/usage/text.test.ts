import os from "os";

import { wrapAndIndent } from "../../src/usage/text";

describe("Usage > Text > wrapAndIndent", () => {
  test("prints a short message without indenting or wrapping", () => {
    expect(wrapAndIndent(0, 80, "hello")).toEqual("hello");
  });

  test("prints a short message with indenting but no wrapping", () => {
    expect(wrapAndIndent(5, 80, "hello")).toEqual("     hello");
  });

  test("wraps a long message without indenting", () => {
    expect(
      wrapAndIndent(0, 20, "this is a long message that is going to wrap")
    ).toEqual(
      "this is a long" + os.EOL + "message that is" + os.EOL + "going to wrap"
    );
  });

  test("wraps a long message with indenting", () => {
    expect(
      wrapAndIndent(5, 30, "this is a long message that is going to wrap")
    ).toEqual(
      "     this is a long message" + os.EOL + "     that is going to wrap"
    );
  });
});

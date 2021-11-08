import "jest-extended";
import {
  extractParameterValue,
  extractParameterFlag,
} from "../../src/command-line/extract";

function getArgs(): string[] {
  return ["--age", "100", "--verbose"];
}

describe("Command-Line > extractParameterValue", () => {
  test("returns the named parameter value", () => {
    expect(extractParameterValue(["--verbose", "--age", "100"], "age")).toEqual(
      "100"
    );
  });

  test("removes the named parameter and its value from the arg list", () => {
    const args = getArgs();
    extractParameterValue(args, "age");
    expect(args).toIncludeSameMembers(["--verbose"]);
  });

  test("returns undefined when the named parameter is not in the arg list", () => {
    expect(extractParameterValue(getArgs(), "city")).toBeUndefined();
  });

  test("leaves the arg list unchanged when the named parameter is not found", () => {
    const args = getArgs();
    extractParameterValue(args, "city");
    expect(args).toIncludeSameMembers(getArgs());
  });

  test("throws when the parameter does not have a value in the arg list", () => {
    expect(() => extractParameterValue(getArgs(), "verbose")).toThrowError();
  });

  test("throws when the parameter value is actually the next argument and not a real value at all", () => {
    expect(() => extractParameterValue(getArgs(), "verbose")).toThrowError();
  });
});

describe("Command-Line > extractParameterFlag", () => {
  test("returns true if the parameter is in the arg list", () => {
    expect(extractParameterFlag(getArgs(), "verbose")).toBeTrue();
  });

  test("removes the named parameter from the arg list", () => {
    const args = getArgs();
    expect(extractParameterFlag(args, "verbose")).toBeTrue();
    expect(args).toIncludeSameMembers(["--age", "100"]);
  });

  test("returns false if the parameter is not in the arg list", () => {
    expect(extractParameterFlag(getArgs(), "kaklslkasd")).toBeFalse();
  });
});

import {
  reportUnsupportedTscOption,
  reportUnsupportedTscOptions,
} from "../src/unsupported";

describe("Unsupported > reportUnsupportedTscOption", () => {
  test("throws an error containing the unsupported option name", () => {
    expect(() => reportUnsupportedTscOption("abcde")).toThrowWithMessage(
      Error,
      /abcde/
    );
  });
});

describe("Unsupported > reportUnsupportedTscOptions", () => {
  test("does not throw when all options are supported", () => {
    reportUnsupportedTscOptions(
      {
        allowJs: true,
        checkJs: false,
      },
      ["abcde", "fgh", "ijklmnop"]
    );
  });

  test("throws an error containing the first unsupported option name", () => {
    expect(() =>
      reportUnsupportedTscOptions(
        {
          allowJs: true,
          checkJs: true,
          strict: true,
        },
        ["checkJs", "strict", "abcde"]
      )
    ).toThrowWithMessage(Error, /checkJs/);
  });
});

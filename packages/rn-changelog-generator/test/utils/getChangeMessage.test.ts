import getChangeMessage from "../../src/utils/getChangeMessage";

console.warn = () => {};
console.error = () => {};

describe(getChangeMessage, () => {
  it("formats a changelog entry", () => {
    expect(
      getChangeMessage({
        sha: "abcde123456789",
        commit: {
          message:
            "Some ignored commit message\n\n[iOS] [Fixed] - Some great fixes! (#42)",
        },
        author: { login: "alloy" },
      })
    ).toEqual(
      "- Some great fixes! ([abcde12345](https://github.com/facebook/react-native/commit/abcde123456789) by [@alloy](https://github.com/alloy))"
    );
  });
});

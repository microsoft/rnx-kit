module.exports = {
  // Jest doesn't support nesting presets:
  // https://github.com/facebook/jest/issues/8714
  ...require("@rnx-kit/jest-preset/jest-preset"),
  collectCoverage: true,
  collectCoverageFrom: ["src/**"],
  roots: ["test"],
  testRegex: "/test/.*\\.test\\.[jt]sx?$",
};

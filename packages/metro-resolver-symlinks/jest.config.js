module.exports = {
  preset: "@rnx-kit/jest-preset/private",
  moduleNameMapper: {
    "__fixtures__[/\\\\].*[/\\\\]metro-resolver$":
      require.resolve("metro-resolver"),
  },
};

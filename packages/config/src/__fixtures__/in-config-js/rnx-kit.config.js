module.exports = {
  platformBundle: {
    distPath: "./distro",
    bundlePrefix: "fakeIndex",
  },
  bundle: {
    id: "test-bundle",
    targets: ["ios", "android"],
  },
  dependencies: () => ({
    foo: "1.2.3",
    bar: "4.5.6",
  }),
};

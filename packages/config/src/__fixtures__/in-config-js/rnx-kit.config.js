module.export = {
  platformBundle: {
    distPath: "./distro",
    bundlePrefix: "fakeIndex",
  },
  dependencies: () => ({
    foo: "1.2.3",
    bar: "4.5.6",
  }),
};

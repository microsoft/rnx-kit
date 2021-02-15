module.exports = {
  platformBundle: {
    distPath: "./distro",
    bundlePrefix: "fakeIndex",
  },
  bundle: {
    id: "core",
    entryPath: "./core-entry.js",
    distPath: "./build-out",
    assetsPath: "./build-out/assets",
    bundlePrefix: "main",
    targets: ["ios", "android", "macos", "windows"],
    platforms: {
      android: {
        assetsPath: "./build-out/res",
      },
    },
  },
  dependencies: () => ({
    foo: "1.2.3",
    bar: "4.5.6",
  }),
};

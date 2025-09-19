const { exclusionList, makeMetroConfig } = require("@rnx-kit/metro-config");
const MetroSymlinksResolver = require("@rnx-kit/metro-resolver-symlinks");
const path = require("node:path");

const coreAppDir = path.resolve(__dirname, "..", "test-app", "src", "internal");

module.exports = makeMetroConfig({
  resolver: {
    extraNodeModules: {
      "@/hermes": path.join(coreAppDir, "hermes.ts"),
      internal: coreAppDir,
    },
    resolveRequest: MetroSymlinksResolver(),
    blockList: exclusionList([
      // Metro will pick up react-native-macos/-windows mocks if we don't exclude them
      /[/\\]__fixtures__[/\\]/,
    ]),
  },
});

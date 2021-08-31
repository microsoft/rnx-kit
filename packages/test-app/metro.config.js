const {
  defaultRoots,
  defaultWatchFoldersInRepo,
  exclusionList,
  makeMetroConfig,
} = require("@rnx-kit/metro-config");

// Metro will pick up react-native-macos/-windows mocks if we don't exclude them
const blockList = exclusionList([/.*__fixtures__.*/]);

module.exports = makeMetroConfig({
  projectRoot: __dirname + "/src",
  roots: defaultRoots(),
  watchFolders: defaultWatchFoldersInRepo(),
  resolver: {
    blacklistRE: blockList,
    blockList,
  },
});

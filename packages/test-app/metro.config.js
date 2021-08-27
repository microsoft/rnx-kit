const { exclusionList, makeMetroConfig } = require("@rnx-kit/metro-config");

// Metro will pick up react-native-macos/-windows mocks if we don't exclude them
const blockList = exclusionList([/.*__fixtures__.*/]);

module.exports = makeMetroConfig({
  projectRoot: __dirname + "/src",
  resolver: {
    blacklistRE: blockList,
    blockList,
  },
});

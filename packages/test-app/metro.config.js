const { exclusionList, makeMetroConfig } = require("@rnx-kit/metro-config");
const MetroSymlinksResolver = require("@rnx-kit/metro-resolver-symlinks");

// If USE_AUTH_MOCK=1, exclude the real module to enable the mock.
const useAuthMock = process.env["USE_AUTH_MOCK"];

const blockList = exclusionList([
  // Metro will pick up react-native-macos/-windows mocks if we don't exclude them
  /.*__fixtures__.*/,

  // If USE_AUTH_MOCK=1, exclude the real module to enable the mock.
  ...(useAuthMock ? [/.*packages[/\\]react-native-auth.*/] : []),
]);

module.exports = makeMetroConfig({
  resolver: {
    extraNodeModules: {
      ...(useAuthMock
        ? {
            "@rnx-kit/react-native-auth": require("path").join(
              __dirname,
              "test",
              "__mocks__",
              "@rnx-kit",
              "react-native-auth.js"
            ),
          }
        : {}),
    },
    resolveRequest: MetroSymlinksResolver(),
    blacklistRE: blockList,
    blockList,
  },
});

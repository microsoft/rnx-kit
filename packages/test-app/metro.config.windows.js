const { makeMetroConfig } = require("@rnx-kit/metro-config");
const fs = require("fs");
const path = require("path");

const rnwPath = fs.realpathSync(
  path.resolve(require.resolve("react-native-windows/package.json"))
);

module.exports = makeMetroConfig({
  projectRoot: path.join(__dirname, "src"),
  watchFolders: [path.resolve(__dirname, "..", "..")],
  resolver: {
    extraNodeModules: {
      // Redirect react-native to react-native-windows
      "react-native": rnwPath,
      "react-native-windows": rnwPath,
    },
  },
});

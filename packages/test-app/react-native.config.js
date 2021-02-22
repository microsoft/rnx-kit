const path = require("path");

if (
  process.argv.includes("--config=metro.config.windows.js") ||
  process.argv.includes("run-windows")
) {
  const sourceDir = "windows";
  module.exports = {
    project: {
      windows: {
        sourceDir,
        project: {
          projectFile: path.relative(
            path.join(__dirname, sourceDir),
            path.join(
              "node_modules",
              ".generated",
              "windows",
              "ReactTestApp",
              "ReactTestApp.vcxproj"
            )
          ),
        },
      },
    },
    reactNativePath: "node_modules/react-native-windows",
  };
} else {
  const sourceDir = "android";
  module.exports = {
    project: {
      android: {
        sourceDir,
        manifestPath: path.relative(
          path.join(__dirname, sourceDir),
          path.join(
            path.dirname(require.resolve("react-native-test-app/package.json")),
            "android",
            "app",
            "src",
            "main",
            "AndroidManifest.xml"
          )
        ),
      },
      ios: {
        project: "ios/ReactTestApp-Dummy.xcodeproj",
      },
    },
  };
}

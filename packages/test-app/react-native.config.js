const fs = require("fs");
const path = require("path");

const windowsProjectFile = path.join(
  "node_modules",
  ".generated",
  "windows",
  "ReactTestApp",
  "ReactTestApp.vcxproj"
);

module.exports = {
  project: {
    android: {
      sourceDir: "android",
      manifestPath: path.relative(
        path.join(__dirname, "android"),
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
      project: (() => {
        const {
          packageSatisfiesVersionRange,
        } = require("react-native-test-app/scripts/configure");
        if (
          packageSatisfiesVersionRange(
            "@react-native-community/cli-platform-ios",
            "<5.0.2"
          )
        ) {
          // Prior to @react-native-community/cli-platform-ios v5.0.0,
          // `project` was only used to infer `sourceDir` and `podfile`.
          return "ios/ReactTestApp-Dummy.xcodeproj";
        }

        // `sourceDir` and `podfile` detection was fixed in
        // @react-native-community/cli-platform-ios v5.0.2 (see
        // https://github.com/react-native-community/cli/pull/1444).
        return "node_modules/.generated/ios/ReactTestApp.xcodeproj";
      })(),
    },
    windows: fs.existsSync(windowsProjectFile) && {
      sourceDir: "windows",
      solutionFile: "Example.sln",
      project: {
        projectFile: path.relative(
          path.join(__dirname, "windows"),
          windowsProjectFile
        ),
      },
    },
  },
};

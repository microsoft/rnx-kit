const { configureProjects } = require("react-native-test-app");
module.exports = {
  project: configureProjects({
    ios: {
      sourceDir: "ios",
    },
  }),
};

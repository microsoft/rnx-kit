const app = require("./lib/index");

module.exports = {
  commands: [
    {
      name: "rnx-bundle <first> [last]",
      description: "Bundle your react-native experience for offline use",
      func: app.rnxBundle,
      options: [
        {
          name: "--path [bundlePath]",
          description: "Path to the bundle file",
        },
      ],
      examples: [
        {
          desc: "Example 1 described here",
          cmd: "rnx-bundle --path somewhere 1",
        },
      ],
    },
  ],
};

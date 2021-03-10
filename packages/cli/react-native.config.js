const cli = require("./lib/index");

module.exports = {
  commands: [
    {
      name: "rnx-bundle",
      description: "Bundle your react-native experience for offline use",
      func: cli.rnxBundle,
      options: [
        {
          name: "--entry-path [file]",
          description:
            "Path to the root JS file, either absolute or relative to the package",
        },
        {
          name: "--dist-path [path]",
          description:
            "Path where the bundle is written, either absolute or relative to the package",
        },
        {
          name: "--assets-path [path]",
          description:
            "Path where bundle assets like images are written, either absolute or relative to the package",
        },
        {
          name: "--bundle-prefix [prefix]",
          description:
            "Bundle file prefix, followed by the platform and bundle file extension",
        },
        {
          name: "--id [id]",
          description:
            "Target bundle id, only needed when config describes multiple bundles",
        },
        {
          name: "--platform [ios|android|windows|win32|macos]",
          description:
            "Target platform; when not given, all platforms are bundled",
          parse: cli.parsePlatform,
        },
        {
          name: "--dev [boolean]",
          description:
            "If false, warnings are disabled and the bundle is minified",
          default: true,
          parse: cli.parseBoolean,
        },
      ],
    },
    {
      name: "rnx-start",
      description: "Starts a bundle webserver for your react-native experience",
      func: cli.rnxStart,
      options: [
        {
          name: "--port [port]",
          parse: parseInt,
        },
      ],
    },
  ],
};

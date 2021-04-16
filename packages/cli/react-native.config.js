const cli = require("./lib/index");

module.exports = {
  commands: [
    {
      name: "rnx-bundle",
      description: "Bundle your react-native experience for offline use",
      func: cli.rnxBundle,
      options: [
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
          name: "--bundle-encoding [string]",
          description:
            "Encoding the bundle should be written in (https://nodejs.org/api/buffer.html#buffer_buffers_and_character_encodings).",
        },
        {
          name: "--transformer [string]",
          description: "Specify a custom transformer to be used",
        },
        {
          name: "--dev [boolean]",
          description:
            "If false, warnings are disabled and the bundle is minified",
          default: true,
          parse: cli.parseBoolean,
        },
        {
          name: "--minify [boolean]",
          description:
            "Allows overriding whether bundle is minified. Disabling minification can be useful for speeding up production builds for testing purposes.",
          parse: cli.parseBoolean,
        },
        {
          name: "--max-workers [number]",
          description:
            "Specifies the maximum number of workers the worker-pool will spawn for transforming files. This defaults to the number of the cores available on your machine.",
          parse: parseInt,
        },
        {
          name: "--sourcemap-output [string]",
          description:
            "Path to the bundle source map, either absolute or relative to the dist-path.",
        },
        {
          name: "--sourcemap-sources-root [string]",
          description:
            "Path to use when relativizing entries in the bundle source map.",
        },
        {
          name: "--sourcemap-use-absolute-path",
          description: "Report SourceMapURL using its full path",
        },
        {
          name: "--reset-cache",
          description: "Removes cached files",
        },
        {
          name: "--read-global-cache",
          description:
            "Try to fetch transformed JS code from the global cache, if configured.",
        },
        {
          name: "--config [string]",
          description: "Path to the metro CLI configuration file",
        },
      ],
    },
  ],
};

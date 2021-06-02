const {
  parsePlatform,
  parseBoolean,
  rnxBundle,
  rnxDepCheck,
  rnxWriteThirdPartyNotices,
} = require("./lib/index");

module.exports = {
  commands: [
    {
      name: "rnx-bundle",
      description: "Bundle your react-native experience for offline use",
      func: rnxBundle,
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
          parse: parsePlatform,
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
          parse: parseBoolean,
        },
        {
          name: "--minify [boolean]",
          description:
            "Allows overriding whether bundle is minified. Disabling minification can be useful for speeding up production builds for testing purposes.",
          parse: parseBoolean,
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
    {
      name: "rnx-dep-check",
      description: "Dependency checker for React Native apps",
      func: rnxDepCheck,
      options: [
        {
          name: "--custom-profiles [module]",
          description:
            "Path to custom profiles. This can be a path to a JSON file, a `.js` file, or a module name.",
        },
        {
          name: "--init [app|library]",
          description: "Writes an initial kit config",
        },
        {
          name: "--vigilant [versions]",
          description:
            "Inspects packages regardless of whether they've been configured. Specify a comma-separated list of profile versions to compare against, e.g. `0.63,0.64`. The first number specifies the target version.",
        },
        {
          name: "--write",
          description: "Writes all changes to the specified `package.json`",
        },
      ],
    },
    {
      name: "rnx-write-third-party-notices",
      description: "Writes third party notices based on the given bundle",
      func: rnxWriteThirdPartyNotices,
      options: [
        {
          name: "--root-path <path>",
          description:
            "The root of the repo where to start resolving modules from.",
        },
        {
          name: "--source-,ap-file <file>",
          description: "The sourceMap file to generate licence contents for.",
        },
        {
          name: "--output-file [file]",
          description: "The output file to write the licence file to.",
        },
        {
          name: "--ignore-scopes [string]",
          description:
            "Comma separated list of npm scopes to ignore and not emit licence information for",
        },
        {
          name: "--ignore-modules [string]",
          description:
            "Comma separated list of modules (js packages) to not emit licence information for ",
        },
        {
          name: "--preamble-text [string]",
          description:
            "A string to prepend at the start of the generated licence file.",
        },
        {
          name: "--additional-text [path]",
          description:
            "A string to append at the end of the generated licence file.",
        },
      ],
    },
  ],
};

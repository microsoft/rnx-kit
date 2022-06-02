const { parsePlatform } = require("@rnx-kit/tools-react-native/platform");
const path = require("path");
const {
  parseBoolean,
  parseTransformProfile,
  rnxBundle,
  rnxCopyAssetsCommand,
  rnxStart,
  rnxDepCheckCommand,
  rnxTestCommand,
  rnxWriteThirdPartyNotices,
  rnxClean,
} = require("./lib/index");

module.exports = {
  commands: [
    {
      name: "rnx-bundle",
      description:
        "Bundle your rnx-kit package for offline use. See https://aka.ms/rnx-kit.",
      func: rnxBundle,
      options: [
        {
          name: "--id [id]",
          description:
            "Target bundle definition. This is only needed when the rnx-kit configuration has multiple bundle definitions.",
        },
        {
          name: "--entry-file [path]",
          description:
            "Path to the root JavaScript or TypeScript file, either absolute or relative to the package.",
        },
        {
          name: "--platform [ios|android|windows|win32|macos]",
          description:
            "Target platform. When not given, all platforms in the rnx-kit configuration are bundled.",
          parse: parsePlatform,
        },
        {
          name: "--dev [boolean]",
          description:
            "If false, warnings are disabled and the bundle is minified.",
          default: true,
          parse: parseBoolean,
        },
        {
          name: "--minify [boolean]",
          description:
            "Controls whether or not the bundle is minified. Disabling minification is useful for test builds.",
          parse: parseBoolean,
        },
        {
          name: "--bundle-output [string]",
          description:
            "Path to the output bundle file, either absolute or relative to the package.",
        },
        {
          name: "--bundle-encoding [utf8|utf16le|ascii]",
          description:
            "Character encoding to use when writing the bundle file.",
          default: "utf8",
        },
        {
          name: "--max-workers [number]",
          description:
            "Specifies the maximum number of parallel worker threads to use for transforming files. This defaults to the number of cores available on your machine.",
          parse: parseInt,
        },
        {
          name: "--sourcemap-output [string]",
          description:
            "Path where the bundle source map is written, either absolute or relative to the package.",
        },
        {
          name: "--sourcemap-sources-root [string]",
          description:
            "Path to use when relativizing file entries in the bundle source map.",
        },
        {
          name: "--sourcemap-use-absolute-path",
          description: "Report SourceMapURL using its full path",
        },
        {
          name: "--assets-dest [path]",
          description:
            "Path where bundle assets like images are written, either absolute or relative to the package. If not given, assets are ignored.",
        },
        {
          name: "--tree-shake [boolean]",
          description:
            "Enable tree shaking to remove unused code and reduce the bundle size.",
          parse: parseBoolean,
          default: false,
        },
        {
          name: "--unstable-transform-profile [string]",
          description:
            "Experimental, transform JS for a specific JS engine. Currently supported: hermes, hermes-canary, default",
          parse: parseTransformProfile,
        },
        {
          name: "--reset-cache",
          description: "Reset the Metro cache.",
        },
        {
          name: "--config [string]",
          description: "Path to the Metro configuration file.",
        },
      ],
    },
    {
      name: "rnx-start",
      func: rnxStart,
      description:
        "Start a bundle-server to host your react-native experience during development",
      options: [
        {
          name: "--port [number]",
          description:
            "Host port to use when listening for incoming server requests.",
          parse: parseInt,
          default: 8081,
        },
        {
          name: "--host [string]",
          description:
            "Host name or address to bind when listening for incoming server requests. When not given, requests from all addresses are accepted.",
          default: "",
        },
        {
          name: "--projectRoot [path]",
          description:
            "Path to the root of your react-native project. The bundle server uses this root path to resolve all web requests.",
          parse: (val) => path.resolve(val),
        },
        {
          name: "--watchFolders [paths]",
          description:
            "Additional folders which will be added to the file-watch list. Comma-separated. By default, Metro watches all project files.",
          parse: (val) => val.split(",").map((folder) => path.resolve(folder)),
        },
        {
          name: "--assetPlugins [list]",
          description:
            "Additional asset plugins to be used by the Metro Babel transformer. Comma-separated list containing plugin module names or absolute paths to plugin packages.",
          parse: (val) => val.split(","),
        },
        {
          name: "--sourceExts [list]",
          description:
            "Additional source-file extensions to include when generating bundles. Comma-separated list, excluding the leading dot.",
          parse: (val) => val.split(","),
        },
        {
          name: "--max-workers [number]",
          description:
            "Specifies the maximum number of parallel worker threads to use for transforming files. This defaults to the number of cores available on your machine.",
          parse: parseInt,
        },
        {
          name: "--reset-cache",
          description: "Reset the Metro cache.",
        },
        {
          name: "--custom-log-reporter-path [string]",
          description:
            "Path to a JavaScript file which exports a Metro 'TerminalReporter' function. This replaces the default reporter, which writes all messages to the Metro console.",
        },
        {
          name: "--https",
          description:
            "Use a secure (https) web server. When not specified, an insecure (http) web server is used.",
        },
        {
          name: "--key [path]",
          description:
            "Path to a custom SSL private key file to use for secure (https) communication.",
        },
        {
          name: "--cert [path]",
          description:
            "Path to a custom SSL certificate file to use for secure (https) communication.",
        },
        {
          name: "--config [string]",
          description: "Path to the Metro configuration file.",
          parse: (val) => path.resolve(val),
        },
        {
          name: "--no-interactive",
          description: "Disables interactive mode.",
        },
      ],
    },
    rnxCopyAssetsCommand,
    rnxDepCheckCommand,
    rnxTestCommand,
    {
      name: "rnx-write-third-party-notices",
      description: "Writes third party notices based on the given bundle",
      func: rnxWriteThirdPartyNotices,
      options: [
        {
          name: "--source-map-file <file>",
          description:
            "The source map file associated with the package's entry file. This source map eventually leads to all package dependencies and their licenses.",
        },
        {
          name: "--output-file [file]",
          description:
            "The path to use when writing the 3rd-party notice file.",
        },
        {
          name: "--root-path <path>",
          description:
            "The root of the repo. This is the starting point for finding each module in the source map dependency graph.",
        },
        {
          name: "--ignore-scopes [string]",
          description:
            "Comma-separated list of `npm` scopes to ignore when traversing the source map dependency graph.",
        },
        {
          name: "--ignore-modules [string]",
          description:
            "Comma-separated list of modules to ignore when traversing the source map dependency graph.",
        },
        {
          name: "--preamble-text [string]",
          description:
            "A string to prepend to the start of the 3rd-party notice.",
        },
        {
          name: "--additional-text [path]",
          description: "A string to append to the end of the 3rd-party notice.",
        },
        {
          name: "--json",
          description:
            "Format the 3rd-party notice file as JSON instead of text.",
          default: false,
          parse: parseBoolean,
        },
      ],
    },
    {
      name: "rnx-clean",
      func: rnxClean,
      description: "Clears React Native project related caches",
      options: [
        {
          name: "--include [android,cocoapods,metro,npm,watchman,yarn]",
          description:
            "Comma-separated flag of caches to clear, e.g. `npm,yarn`. When not specified, only non-platform specific caches are cleared.",
          default: "metro,npm,watchman,yarn",
        },
        {
          name: "--project-root <path>",
          description: "Root path to your React Native project",
          default: process.cwd(),
          parse: (val) => path.resolve(val),
        },
        {
          name: "--verify",
          description: "Whether to verify the integrity of the cache",
          default: false,
        },
      ],
    },
  ],
};

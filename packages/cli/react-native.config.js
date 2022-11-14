const path = require("path");
const {
  parseBoolean,
  parseInt,
  rnxAlignDepsCommand,
  rnxBundleCommand,
  rnxClean,
  rnxCopyAssetsCommand,
  rnxRamBundleCommand,
  rnxStart,
  rnxTestCommand,
  rnxWriteThirdPartyNotices,
} = require("./lib/index");

module.exports = {
  commands: [
    rnxBundleCommand,
    rnxRamBundleCommand,
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
    rnxAlignDepsCommand,
    rnxTestCommand,
    {
      name: "rnx-write-third-party-notices",
      description: "Writes third party notices based on the given bundle",
      func: rnxWriteThirdPartyNotices,
      options: [
        {
          name: "--root-path <path>",
          description:
            "The root of the repo. This is the starting point for finding each module in the source map dependency graph.",
        },
        {
          name: "--source-map-file <file>",
          description:
            "The source map file associated with the package's entry file. This source map eventually leads to all package dependencies and their licenses.",
        },
        {
          name: "--json",
          description:
            "Format the 3rd-party notice file as JSON instead of text.",
          default: false,
          parse: parseBoolean,
        },
        {
          name: "--output-file [file]",
          description:
            "The path to use when writing the 3rd-party notice file.",
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

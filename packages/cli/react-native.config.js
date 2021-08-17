const path = require("path");

const {
  parsePlatform,
  parseBoolean,
  rnxBundle,
  rnxStart,
  rnxDepCheckCommand,
  rnxTestCommand,
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
            "Target bundle definition. This is only needed when the kit configuration has multiple bundle definitions.",
        },
        {
          name: "--platform [ios|android|windows|win32|macos]",
          description:
            "Target platform. When not given, all platforms in the kit configuration are bundled.",
          parse: parsePlatform,
        },
        {
          name: "--entry-path [file]",
          description:
            "Path to the root JavaScript file, either absolute or relative to the kit package.",
        },
        {
          name: "--dist-path [path]",
          description:
            "Path where the bundle is written, either absolute or relative to the kit package.",
        },
        {
          name: "--assets-path [path]",
          description:
            "Path where bundle assets like images are written, either absolute or relative to the kit package.",
        },
        {
          name: "--bundle-prefix [prefix]",
          description:
            "Bundle file prefix. This is followed by the platform and bundle file extension.",
        },
        {
          name: "--bundle-encoding [utf8|utf16le|ascii]",
          description:
            "Character encoding to use when writing the bundle file.",
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
          name: "--experimental-tree-shake [boolean]",
          description: "Experimental: Enable tree shaking.",
          parse: parseBoolean,
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
            "Path where the bundle source map is written, either absolute or relative to the dist-path.",
        },
        {
          name: "--sourcemap-sources-root [string]",
          description:
            "Path to use when relativizing file entries in the bundle source map.",
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
          name: "--host [string]",
          description:
            "Host name or address to bind when listening for incoming server requests. When not given, requests from all addresses are accepted.",
          default: "",
        },
        {
          name: "--port [number]",
          description:
            "Host port to use when listening for incoming server requests.",
          parse: parseInt,
          default: 8081,
        },
        {
          name: "--project-root [path]",
          description:
            "Path to the root of your react-native experience project. The bundle server uses this root path to resolve all web requests.",
          parse: (val) => path.resolve(val),
        },
        {
          name: "--watch-folders [paths]",
          description:
            "Additional folders which will be added to the file-watch list. Comma-separated. By default, Metro watches all project files, and triggers a bundle-reload when anything changes.",
          parse: (val) => val.split(",").map((folder) => path.resolve(folder)),
        },
        {
          name: "--asset-plugins [list]",
          description:
            "Additional asset plugins to be used by the Metro Babel transformer. Comma-separated list containing plugin modules and/or absolute paths to plugin packages.",
          parse: (val) => val.split(","),
        },
        {
          name: "--source-exts [list]",
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
          name: "--reset-cache",
          description: "Reset the Metro cache.",
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
    rnxDepCheckCommand,
    rnxTestCommand,
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
          name: "--source-map-file <file>",
          description: "The sourceMap file to generate licence contents for.",
        },
        {
          name: "--json",
          description: "Output license information as a JSON",
          default: false,
          parse: parseBoolean,
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

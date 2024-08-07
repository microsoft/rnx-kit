import { parsePlatform } from "@rnx-kit/tools-react-native/platform";
import { asBoolean, asNumber, asTransformProfile } from "../helpers/parsers";

export const commonBundleCommandOptions = [
  {
    name: "--id <id>",
    description:
      "Target bundle definition; only needed when the rnx-kit configuration has multiple bundle definitions",
  },
  {
    name: "--entry-file <path>",
    description:
      "Path to the root JavaScript or TypeScript file, either absolute or relative to the package",
  },
  {
    name: "--platform <ios|android|windows|win32|macos>",
    description:
      "Target platform; when unspecified, all platforms in the rnx-kit configuration are bundled",
    parse: parsePlatform,
  },
  {
    name: "--dev [boolean]",
    description: "If false, warnings are disabled and the bundle is minified",
    default: true,
    parse: asBoolean,
  },
  {
    name: "--minify [boolean]",
    description:
      "Controls whether or not the bundle is minified (useful for test builds)",
    parse: asBoolean,
  },
  {
    name: "--bundle-output <string>",
    description:
      "Path to the output bundle file, either absolute or relative to the package",
  },
  {
    name: "--bundle-encoding <utf8|utf16le|ascii>",
    description: "Character encoding to use when writing the bundle file",
    default: "utf8",
  },
  {
    name: "--max-workers <number>",
    description:
      "Specifies the maximum number of parallel worker threads to use for transforming files; defaults to the number of cores available on your machine",
    parse: asNumber,
  },
  {
    name: "--sourcemap-output <string>",
    description:
      "Path where the bundle source map is written, either absolute or relative to the package",
  },
  {
    name: "--sourcemap-sources-root <string>",
    description:
      "Path to use when relativizing file entries in the bundle source map",
  },
  {
    name: "--sourcemap-use-absolute-path",
    description: "Report SourceMapURL using its full path",
  },
  {
    name: "--assets-dest <path>",
    description:
      "Path where bundle assets like images are written, either absolute or relative to the package; if unspecified, assets are ignored",
  },
  {
    name: "--unstable-transform-profile <string>",
    description:
      "[Experimental] Transform JS for a specific JS engine; currently supported: hermes, hermes-canary, default",
    parse: asTransformProfile,
  },
  {
    name: "--reset-cache",
    description: "Reset the Metro cache",
  },
  {
    name: "--config <string>",
    description: "Path to the Metro configuration file",
  },
];

import type { ExcludedPackage } from "../types.ts";

/**
 * Known bad/deprecated packages.
 *
 * When a package was renamed or superseded by another package that is provided
 * by a capability, set `capability` to that capability's name. `align-deps` will
 * then remove the stale package — but only when the capability is actually
 * declared/managed by the target package. This ensures we never remove a package
 * that the consumer isn't managing via `align-deps`.
 */
export const bannedPackages: Readonly<Record<string, ExcludedPackage>> = {
  "@react-native-community/async-storage": {
    name: "@react-native-community/async-storage",
    version: "*",
    capability: "storage",
    reason:
      "This package was renamed to '@react-native-async-storage/async-storage' in 1.13.0. The new package is recommended in 0.64.",
  },
  "@react-native-community/clipboard": {
    name: "@react-native-community/clipboard",
    version: "*",
    capability: "clipboard",
    reason:
      "This package was renamed to '@react-native-clipboard/clipboard' in 1.6.0. The new package is recommended in 0.64.",
  },
  "@react-native-community/eslint-config": {
    name: "@react-native-community/eslint-config",
    version: "*",
    reason:
      "As of 'react-native' 0.72, you should use '@react-native/eslint-config' instead. Alternatively, if you're looking for an ESLint 9.x compatible config, try '@rnx-kit/eslint-plugin'.",
  },
  "@react-native-community/masked-view": {
    name: "@react-native-community/masked-view",
    version: "*",
    capability: "masked-view",
    reason:
      "This package was renamed to '@react-native-masked-view/masked-view' in 0.2.0. Please remove the old package and start using the new one.",
  },
  "@types/react-native": {
    name: "@types/react-native",
    version: ">=0.71.0-0",
    reason:
      "Types are included in react-native starting with 0.71.0. '@types/react-native' is deprecated from 0.72 onwards.",
  },
  "hermes-engine": {
    name: "hermes-engine",
    version: "~0.11.0",
    capability: "hermes",
    reason:
      "Hermes is included with react-native starting with 0.70. Remove this package when you're on react-native 0.70 or higher.",
  },
  "metro-react-native-babel-preset": {
    name: "metro-react-native-babel-preset",
    version: "*",
    capability: "babel-preset-react-native",
    reason:
      "This package was renamed to '@react-native/babel-preset' in react-native 0.73. Replace this package when you're on react-native 0.73 or higher.",
  },
  "react-native-linear-gradient": {
    name: "react-native-linear-gradient",
    version: "<2.6.0",
    reason:
      "This package causes significant degradation in app start up time prior to 2.6.0.",
  },
  "react-native-lazy-index": {
    name: "react-native-lazy-index",
    version: "*",
    capability: "lazy-index",
    reason:
      "This package was renamed to '@rnx-kit/react-native-lazy-index'. The new package is recommended in 0.66.",
  },
  "react-native-netinfo": {
    name: "react-native-netinfo",
    version: "*",
    capability: "netinfo",
    reason:
      "This is an old and unmaintained fork of @react-native-netinfo/netinfo.",
  },
};

import type { ExcludedPackage } from "../types";

export const bannedPackages: ExcludedPackage[] = [
  {
    name: "@react-native-community/async-storage",
    version: "*",
    reason:
      "This package was renamed to '@react-native-async-storage/async-storage' in 1.13.0. The new package is recommended in 0.64.",
  },
  {
    name: "@react-native-community/clipboard",
    version: "*",
    reason:
      "This package was renamed to '@react-native-clipboard/clipboard' in 1.6.0. The new package is recommended in 0.64.",
  },
  {
    name: "@react-native-community/eslint-config",
    version: "*",
    reason:
      "As of 'react-native' 0.72, you should use '@react-native/eslint-config' instead. Alternatively, if you're looking for an ESLint 9.x compatible config, try '@rnx-kit/eslint-plugin'.",
  },
  {
    name: "@react-native-community/masked-view",
    version: "*",
    reason:
      "This package was renamed to '@react-native-masked-view/masked-view' in 0.2.0. Please remove the old package and start using the new one.",
  },
  {
    name: "@types/react-native",
    version: ">=0.71.0-0",
    reason:
      "Types are included in react-native starting with 0.71.0. '@types/react-native' is deprecated from 0.72 onwards.",
  },
  {
    name: "hermes-engine",
    version: "~0.11.0",
    reason:
      "Hermes is included with react-native starting with 0.70. Remove this package when you're on react-native 0.70 or higher.",
  },
  {
    name: "metro-react-native-babel-preset",
    version: "*",
    reason:
      "This package was renamed to '@react-native/babel-preset' in react-native 0.73. Replace this package when you're on react-native 0.73 or higher.",
  },
  {
    name: "react-native-linear-gradient",
    version: "<2.6.0",
    reason:
      "This package causes significant degradation in app start up time prior to 2.6.0.",
  },
  {
    name: "react-native-lazy-index",
    version: "*",
    reason:
      "This package was renamed to '@rnx-kit/react-native-lazy-index'. The new package is recommended in 0.66.",
  },
  {
    name: "react-native-netinfo",
    version: "*",
    reason:
      "This is an old and unmaintained fork of @react-native-netinfo/netinfo.",
  },
];

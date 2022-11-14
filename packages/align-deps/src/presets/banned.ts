import type { ExcludedPackage } from "../types";

const bannedPackages: ExcludedPackage[] = [
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

export default bannedPackages;

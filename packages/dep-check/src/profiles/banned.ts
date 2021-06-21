import type { ExcludedPackage } from "../types";

const bannedPackages: ExcludedPackage[] = [
  {
    name: "@react-native-community/async-storage",
    version: "*",
    reason:
      "This package was renamed to '@react-native-async-storage/async-storage' in 1.13.0. The new package will be used in 0.64.",
  },
  {
    name: "@react-native-community/masked-view",
    version: "*",
    reason:
      "This package was renamed to '@react-native-masked-view/masked-view' in 0.2.0. The new package will be used in 0.64.",
  },
  {
    name: "react-native-linear-gradient",
    version: "*",
    reason:
      "This package is unmaintained and causes significant degradation in app start up time.",
  },
  {
    name: "react-native-netinfo",
    version: "*",
    reason:
      "This is an old and unmaintained fork of @react-native-netinfo/netinfo.",
  },
];

export default bannedPackages;

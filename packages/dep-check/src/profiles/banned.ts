import type { ExcludedPackage } from "../types";

const bannedPackages: ExcludedPackage[] = [
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

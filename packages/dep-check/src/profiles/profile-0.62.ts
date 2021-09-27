import type { Profile } from "../types";
import profile61, { reactNativeMeta } from "./profile-0.61";

const profile: Profile = {
  ...profile61,
  "react-native": {
    name: "react-native",
    version: "^0.62.3",
    capabilities: ["react"],
  },
  react: {
    name: "react",
    version: "16.11.0",
  },
  "react-dom": {
    name: "react-dom",
    version: "16.11.0",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "16.11.0",
    capabilities: ["react"],
    devOnly: true,
  },
  core: reactNativeMeta,
  "core-android": reactNativeMeta,
  "core-ios": reactNativeMeta,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.62.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.62.0",
    capabilities: ["core"],
  },
  hermes: {
    name: "hermes-engine",
    version: "~0.4.0",
  },
  netinfo: {
    name: "@react-native-community/netinfo",
    version: "^5.9.10",
  },
  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.58.0",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.58.0",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.58.0",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.58.0",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.58.0",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.58.0",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.58.0",
    devOnly: true,
  },
};

export default profile;

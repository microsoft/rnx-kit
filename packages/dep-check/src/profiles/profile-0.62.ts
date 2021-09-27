import type { Profile } from "../types";
import profile61 from "./profile-0.61";

const reactNative = {
  name: "react-native",
  version: "^0.62.3",
};

const profile: Profile = {
  ...profile61,
  react: {
    name: "react",
    version: "16.11.0",
  },
  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.62.0",
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

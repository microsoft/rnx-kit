import type { Profile } from "../types";
import profile_0_65 from "./profile-0.65";

const reactNative = {
  name: "react-native",
  version: "^0.66.0-0",
  capabilities: ["react"],
};

const profile: Profile = {
  ...profile_0_65,
  react: {
    name: "react",
    version: "17.0.2",
  },
  "react-dom": {
    name: "react-dom",
    version: "17.0.2",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "17.0.2",
    capabilities: ["react"],
    devOnly: true,
  },
  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.66.0-0",
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.66.0-0",
    capabilities: ["core"],
  },

  hermes: {
    name: "hermes-engine",
    version: "~0.9.0",
  },
  html: {
    name: "react-native-render-html",
    version: "^6.1.0",
  },
  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.66.2",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.66.2",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.66.2",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.66.2",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.66.2",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.66.2",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.66.2",
    devOnly: true,
  },
  react: {
    name: "react",
    version: "17.0.2",
  },
};

export default profile;

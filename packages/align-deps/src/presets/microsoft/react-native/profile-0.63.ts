import type { Package, Profile } from "../../../types";
import profile62 from "./profile-0.62";

const reactNative: Package = {
  name: "react-native",
  version: "^0.63.2",
  capabilities: ["react"],
};

const profile: Profile = {
  ...profile62,

  react: {
    name: "react",
    version: "16.13.1",
  },
  "react-dom": {
    name: "react-dom",
    version: "16.13.1",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "16.13.1",
    capabilities: ["react"],
    devOnly: true,
  },

  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.63.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.63.0",
    capabilities: ["core"],
  },

  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.59.0",
    devOnly: true,
  },
  "floating-action": {
    name: "react-native-floating-action",
    version: "^1.21.0",
  },
  gestures: {
    name: "react-native-gesture-handler",
    version: "^1.10.3",
  },
  hermes: {
    name: "hermes-engine",
    version: "~0.5.0",
  },
  jest: {
    name: "jest",
    version: "^24.9.0",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.59.0",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.59.0",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.59.0",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.59.0",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.59.0",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.59.0",
    devOnly: true,
  },
  "navigation/native": {
    name: "@react-navigation/native",
    version: "^5.9.4",
  },
  "navigation/stack": {
    name: "@react-navigation/stack",
    version: "^5.14.4",
    capabilities: ["navigation/native"],
  },
  "safe-area": {
    name: "react-native-safe-area-context",
    version: "^3.2.0",
  },
  screens: {
    name: "react-native-screens",
    version: "^2.18.1",
  },
  webview: {
    name: "react-native-webview",
    version: "^11.4.2",
  },
};

export default profile;

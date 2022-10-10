import type { Package, Profile } from "../../types";
import profile_0_65 from "./profile-0.65";

const reactNative: Package = {
  name: "react-native",
  version: "^0.66.0",
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
    version: "^0.66.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.66.0",
    capabilities: ["core"],
  },

  animation: {
    name: "react-native-reanimated",
    version: "^2.2.3",
  },
  hermes: {
    name: "hermes-engine",
    version: "~0.9.0",
  },
  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.66.2",
    devOnly: true,
  },
  html: {
    name: "react-native-render-html",
    version: "^6.1.0",
  },
  jest: {
    name: "jest",
    version: "^26.6.3",
    devOnly: true,
  },
  "lazy-index": {
    name: "@rnx-kit/react-native-lazy-index",
    version: "^2.1.7",
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
  "navigation/native": {
    name: "@react-navigation/native",
    version: "^6.0.8",
  },
  "navigation/stack": {
    name: "@react-navigation/stack",
    version: "^6.2.0",
    capabilities: ["navigation/native"],
  },
  screens: {
    name: "react-native-screens",
    version: "^3.9.0",
  },
  storage: {
    name: "@react-native-async-storage/async-storage",
    version: "^1.15.9",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^1.0.6",
    devOnly: true,
  },
};

export default profile;

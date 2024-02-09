import type { Package, Profile } from "../../../types";
import { profile as profile_0_72 } from "./profile-0.72";

const reactNative: Package = {
  name: "react-native",
  version: "^0.73.0",
  capabilities: ["react", "core/metro-config"],
};

export const profile: Profile = {
  ...profile_0_72,
  react: {
    name: "react",
    version: "18.2.0",
  },
  "react-dom": {
    name: "react-dom",
    version: "^18.2.0",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "18.2.0",
    capabilities: ["react"],
    devOnly: true,
  },

  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.73.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.73.0",
    capabilities: ["core"],
  },
  "core/metro-config": {
    name: "@react-native/metro-config",
    version: "^0.73.0",
    devOnly: true,
  },

  "babel-preset-react-native": {
    name: "@react-native/babel-preset",
    version: "^0.73.0",
    devOnly: true,
  },
  "community/cli": {
    name: "@react-native-community/cli",
    version: "^12.1.1",
    capabilities: ["community/cli-android", "community/cli-ios"],
    devOnly: true,
  },
  "community/cli-android": {
    name: "@react-native-community/cli-platform-android",
    version: "^12.1.1",
    devOnly: true,
  },
  "community/cli-ios": {
    name: "@react-native-community/cli-platform-ios",
    version: "^12.1.1",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.80.0",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.80.0",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.80.0",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "@react-native/metro-babel-transformer",
    version: "^0.73.0",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.80.0",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.80.0",
    devOnly: true,
  },

  animation: {
    name: "react-native-reanimated",
    version: "^3.6.0",
  },
  gestures: {
    name: "react-native-gesture-handler",
    version: "^2.14.0",
  },
  "masked-view": {
    name: "@react-native-masked-view/masked-view",
    version: "^0.3.0",
  },
  netinfo: {
    name: "@react-native-community/netinfo",
    version: "^11.0.1",
  },
  "safe-area": {
    name: "react-native-safe-area-context",
    version: "^4.8.2",
  },
  screens: {
    name: "react-native-screens",
    version: "^3.28.0",
  },
  storage: {
    name: "@react-native-async-storage/async-storage",
    version: "^1.21.0",
  },
  svg: {
    name: "react-native-svg",
    version: "^14.0.0",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^2.5.34",
    devOnly: true,
  },
  webview: {
    name: "react-native-webview",
    version: "^13.6.1",
  },
};

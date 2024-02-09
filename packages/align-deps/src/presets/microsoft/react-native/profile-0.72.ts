import type { Package, Profile } from "../../../types";
import { profile as profile_0_71 } from "./profile-0.71";

const reactNative: Package = {
  name: "react-native",
  version: "^0.72.0",
  capabilities: ["react", "core/metro-config"],
};

export const profile: Profile = {
  ...profile_0_71,
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
    version: "^0.72.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.72.0",
    capabilities: ["core"],
  },
  "core/metro-config": {
    name: "@react-native/metro-config",
    version: "^0.72.0",
    devOnly: true,
  },

  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.76.5",
    devOnly: true,
  },
  "community/cli": {
    name: "@react-native-community/cli",
    version: "^11.3.2",
    capabilities: ["community/cli-android", "community/cli-ios"],
    devOnly: true,
  },
  "community/cli-android": {
    name: "@react-native-community/cli-platform-android",
    version: "^11.3.2",
    devOnly: true,
  },
  "community/cli-ios": {
    name: "@react-native-community/cli-platform-ios",
    version: "^11.3.2",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.76.5",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.76.5",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.76.5",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.76.5",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.76.5",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.76.5",
    devOnly: true,
  },

  animation: {
    name: "react-native-reanimated",
    version: "^3.3.0",
  },
  "datetime-picker": {
    name: "@react-native-community/datetimepicker",
    version: "^7.6.2",
  },
  gestures: {
    name: "react-native-gesture-handler",
    version: "^2.12.0",
  },
  "safe-area": {
    name: "react-native-safe-area-context",
    version: ">=4.5.3 <4.8",
  },
  screens: {
    name: "react-native-screens",
    version: ">=3.21.0 <3.28.0",
  },
  storage: {
    name: "@react-native-async-storage/async-storage",
    version: "^1.18.2",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^2.5.5",
    devOnly: true,
  },
  webview: {
    name: "react-native-webview",
    version: "^13.2.2",
  },
};

import type { Package, Profile } from "../../../types";
import { profile as profile_0_70 } from "./profile-0.70";

const reactNative: Package = {
  name: "react-native",
  version: "^0.71.0",
  capabilities: ["react"],
};

export const profile: Profile = {
  ...profile_0_70,
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
    version: "^0.71.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.71.0",
    capabilities: ["core"],
  },

  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.73.7",
    devOnly: true,
  },
  "community/cli": {
    name: "@react-native-community/cli",
    version: "^10.0.0",
    capabilities: ["community/cli-android", "community/cli-ios"],
    devOnly: true,
  },
  "community/cli-android": {
    name: "@react-native-community/cli-platform-android",
    version: "^10.0.0",
    devOnly: true,
  },
  "community/cli-ios": {
    name: "@react-native-community/cli-platform-ios",
    version: "^10.0.0",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.73.7",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.73.7",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.73.7",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.73.7",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.73.7",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.73.7",
    devOnly: true,
  },

  animation: {
    name: "react-native-reanimated",
    version: "^2.14.1",
  },
  checkbox: {
    name: "@react-native-community/checkbox",
    version: "^0.5.15",
  },
  "datetime-picker": {
    name: "@react-native-community/datetimepicker",
    version: "^6.4.2",
  },
  gestures: {
    name: "react-native-gesture-handler",
    version: "^2.9.0",
  },
  jest: {
    name: "jest",
    version: "^29.2.1",
    devOnly: true,
  },
  "masked-view": {
    name: "@react-native-masked-view/masked-view",
    version: "^0.2.9",
  },
  "safe-area": {
    name: "react-native-safe-area-context",
    version: "^4.5.1",
  },
  screens: {
    name: "react-native-screens",
    version: "^3.19.0",
  },
  shimmer: {
    name: "react-native-shimmer",
    version: "^0.6.0",
  },
  storage: {
    name: "@react-native-async-storage/async-storage",
    version: "^1.17.11",
  },
  svg: {
    name: "react-native-svg",
    version: "^13.14.0",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^2.2.1",
    devOnly: true,
  },
  webview: {
    name: "react-native-webview",
    version: "^12.0.2",
  },
};

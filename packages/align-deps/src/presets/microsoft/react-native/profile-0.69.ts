import type { Package, Profile } from "../../../types";
import { profile as profile_0_68 } from "./profile-0.68";

const reactNative: Package = {
  name: "react-native",
  version: "^0.69.0",
  capabilities: ["react"],
};

export const profile: Profile = {
  ...profile_0_68,
  react: {
    name: "react",
    version: "18.0.0",
  },
  "react-dom": {
    name: "react-dom",
    version: "^18.0.0",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "18.0.0",
    capabilities: ["react"],
    devOnly: true,
  },

  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.69.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.69.0",
    capabilities: ["core"],
  },

  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.70.3",
    devOnly: true,
  },
  "community/cli": {
    name: "@react-native-community/cli",
    version: "^8.0.4",
    capabilities: ["community/cli-android", "community/cli-ios"],
    devOnly: true,
  },
  "community/cli-android": {
    name: "@react-native-community/cli-platform-android",
    version: "^8.0.4",
    devOnly: true,
  },
  "community/cli-ios": {
    name: "@react-native-community/cli-platform-ios",
    version: "^8.0.4",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.70.1",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.70.1",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.70.1",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.70.1",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.70.1",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.70.1",
    devOnly: true,
  },

  animation: {
    name: "react-native-reanimated",
    version: "^2.9.0",
  },
  gestures: {
    name: "react-native-gesture-handler",
    version: "^2.5.0",
  },
  "masked-view": {
    name: "@react-native-masked-view/masked-view",
    version: "^0.2.7",
  },
  netinfo: {
    name: "@react-native-community/netinfo",
    version: "^8.0.0",
  },
  popover: {
    name: "react-native-popover-view",
    version: "^5.0.0",
  },
  "safe-area": {
    name: "react-native-safe-area-context",
    version: "^4.3.1",
  },
  screens: {
    name: "react-native-screens",
    version: "^3.14.1",
  },
  sqlite: {
    name: "react-native-sqlite-storage",
    version: "^6.0.1",
  },
  storage: {
    name: "@react-native-async-storage/async-storage",
    version: "^1.17.7",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^1.3.10",
    devOnly: true,
  },
  webview: {
    name: "react-native-webview",
    version: "^11.23.0",
  },
};

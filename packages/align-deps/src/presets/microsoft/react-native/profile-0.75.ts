import type { Package, Profile } from "../../../types";
import { profile as profile_0_74 } from "./profile-0.74";

const reactNative: Package = {
  name: "react-native",
  version: "^0.75.0",
  capabilities: ["react", "core/metro-config"],
};

export const profile: Profile = {
  ...profile_0_74,
  react: {
    name: "react",
    version: "^18.2.0",
  },
  "react-dom": {
    name: "react-dom",
    version: "^18.2.0",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "^18.2.0",
    capabilities: ["react"],
    devOnly: true,
  },

  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.75.0",
    capabilities: ["react"],
  },
  "core-visionos": {
    name: "@callstack/react-native-visionos",
    version: "^0.75.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.75.0",
    capabilities: ["core"],
  },
  "core/metro-config": {
    name: "@react-native/metro-config",
    version: "^0.75.0",
    devOnly: true,
  },

  "babel-preset-react-native": {
    name: "@react-native/babel-preset",
    version: "^0.75.0",
    devOnly: true,
  },
  "community/cli": {
    name: "@react-native-community/cli",
    version: "^14.0.0",
    capabilities: ["community/cli-android", "community/cli-ios"],
    devOnly: true,
  },
  "community/cli-android": {
    name: "@react-native-community/cli-platform-android",
    version: "^14.0.0",
    devOnly: true,
  },
  "community/cli-ios": {
    name: "@react-native-community/cli-platform-ios",
    version: "^14.0.0",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.80.3",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.80.3",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.80.3",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "@react-native/metro-babel-transformer",
    version: "^0.75.0",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.80.3",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.80.3",
    devOnly: true,
  },

  screens: {
    name: "react-native-screens",
    version: "^3.34.0",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^3.8.15",
    devOnly: true,
  },
};

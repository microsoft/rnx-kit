import type { Package, Profile } from "../../../types.ts";
import { profile as profile_0_80 } from "./profile-0.80.ts";

const reactNative: Package = {
  name: "react-native",
  version: "^0.81.6",
  capabilities: ["react", "core/metro-config", "community/cli"],
};

export const profile: Profile = {
  ...profile_0_80,

  /*********
   * React *
   *********/

  react: {
    name: "react",
    version: "19.1.4",
  },

  "react-dom": {
    name: "react-dom",
    version: "^19.1.0",
    capabilities: ["react"],
  },

  "react-test-renderer": {
    name: "react-test-renderer",
    version: "19.1.0",
    capabilities: ["react"],
    devOnly: true,
  },

  /********
   * Core *
   ********/

  core: reactNative,

  "core-android": reactNative,
  "core-ios": reactNative,

  "core-macos": {
    name: "react-native-macos",
    version: "^0.81.0",
    capabilities: ["react"],
  },

  "core-visionos": {
    name: "@callstack/react-native-visionos",
    version: "^0.81.0",
    capabilities: ["react"],
  },

  "core-windows": {
    name: "react-native-windows",
    version: "^0.81.0",
    capabilities: ["core"],
  },

  "core/metro-config": {
    name: "@react-native/metro-config",
    version: "^0.81.0",
    devOnly: true,
  },

  /*********
   * Tools *
   *********/

  "babel-preset-react-native": {
    name: "@react-native/babel-preset",
    version: "^0.81.0",
    devOnly: true,
  },

  "community/cli": {
    name: "@react-native-community/cli",
    version: "^20.0.0",
    capabilities: ["community/cli-android", "community/cli-ios"],
    devOnly: true,
  },

  "community/cli-android": {
    name: "@react-native-community/cli-platform-android",
    version: "^20.0.0",
    devOnly: true,
  },

  "community/cli-ios": {
    name: "@react-native-community/cli-platform-ios",
    version: "^20.0.0",
    devOnly: true,
  },

  metro: {
    name: "metro",
    version: "^0.83.1",
    devOnly: true,
  },

  "metro-config": {
    name: "metro-config",
    version: "^0.83.1",
    devOnly: true,
  },

  "metro-core": {
    name: "metro-core",
    version: "^0.83.1",
    devOnly: true,
  },

  "metro-react-native-babel-transformer": {
    name: "@react-native/metro-babel-transformer",
    version: "^0.81.0",
    devOnly: true,
  },

  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.83.1",
    devOnly: true,
  },

  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.83.1",
    devOnly: true,
  },

  /*********************
   * Community Modules *
   *********************/

  gestures: {
    name: "react-native-gesture-handler",
    version: "^2.28.0",
  },

  "safe-area": {
    name: "react-native-safe-area-context",
    version: "^5.6.0",
  },

  screens: {
    name: "react-native-screens",
    version: "^4.19.0",
  },

  svg: {
    name: "react-native-svg",
    version: "^15.12.1",
  },

  "test-app": {
    name: "react-native-test-app",
    version: "^4.4.11",
    devOnly: true,
  },

  animation: {
    name: "react-native-reanimated",
    version: "^3.19.0",
  },
};

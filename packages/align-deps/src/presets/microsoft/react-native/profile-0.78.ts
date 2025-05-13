import type { Package, Profile } from "../../../types";
import { profile as profile_0_77 } from "./profile-0.77";

const reactNative: Package = {
  name: "react-native",
  version: "^0.78.0",
  capabilities: ["react", "core/metro-config", "community/cli"],
};

export const profile: Profile = {
  ...profile_0_77,

  /*********
   * React *
   *********/

  react: {
    name: "react",
    version: "19.0.0",
  },
  "react-dom": {
    name: "react-dom",
    version: "^19.0.0",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "19.0.0",
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
    version: "^0.78.0",
    capabilities: ["react"],
  },
  "core-visionos": {
    name: "@callstack/react-native-visionos",
    version: "^0.78.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.78.0",
    capabilities: ["core"],
  },
  "core/metro-config": {
    name: "@react-native/metro-config",
    version: "^0.78.0",
    devOnly: true,
  },

  /*********
   * Tools *
   *********/

  "babel-preset-react-native": {
    name: "@react-native/babel-preset",
    version: "^0.78.0",
    devOnly: true,
  },
  "community/cli": {
    name: "@react-native-community/cli",
    version: "^15.0.1",
    capabilities: ["community/cli-android", "community/cli-ios"],
    devOnly: true,
  },
  "community/cli-android": {
    name: "@react-native-community/cli-platform-android",
    version: "^15.0.1",
    devOnly: true,
  },
  "community/cli-ios": {
    name: "@react-native-community/cli-platform-ios",
    version: "^15.0.1",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.81.3",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.81.3",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.81.3",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "@react-native/metro-babel-transformer",
    version: "^0.78.0",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.81.3",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.81.3",
    devOnly: true,
  },

  /*********************
   * Community Modules *
   *********************/

  animation: {
    name: "react-native-reanimated",
    version: "^3.17.0",
  },
  gestures: {
    name: "react-native-gesture-handler",
    version: "^2.24.0",
  },
  screens: {
    name: "react-native-screens",
    version: "^4.9.1",
  },
  svg: {
    name: "react-native-svg",
    version: "^15.11.2",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^4.1.4",
    devOnly: true,
  },
};

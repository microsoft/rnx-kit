import type { Package, Profile } from "../../../types";
import profile_0_70 from "./profile-0.70";

const reactNative: Package = {
  name: "react-native",
  version: "^0.71.0",
  capabilities: ["react"],
};

const profile: Profile = {
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

  animation: {
    name: "react-native-reanimated",
    version: "^2.14.1",
  },
  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.73.5",
    devOnly: true,
  },
  gestures: {
    name: "react-native-gesture-handler",
    version: "^2.8.0", // TODO: Update when a 0.71 compatible version is released
  },
  jest: {
    name: "jest",
    version: "^29.2.1",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.73.5",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.73.5",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.73.5",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.73.5",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.73.5",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.73.5",
    devOnly: true,
  },
  screens: {
    name: "react-native-screens",
    version: "^3.18.2", // TODO: Update when a 0.71 compatible version is released
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
    version: "^13.7.0",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^2.2.1",
    devOnly: true,
  },
};

export default profile;

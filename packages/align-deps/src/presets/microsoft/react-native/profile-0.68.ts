import type { Package, Profile } from "../../../types";
import profile_0_67 from "./profile-0.67";

const reactNative: Package = {
  name: "react-native",
  version: "^0.68.0",
  capabilities: ["react"],
};

const profile: Profile = {
  ...profile_0_67,
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
    version: "^0.68.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.68.0",
    capabilities: ["core"],
  },

  animation: {
    name: "react-native-reanimated",
    version: "^2.5.0",
  },
  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.67.0",
    devOnly: true,
  },
  clipboard: {
    name: "@react-native-clipboard/clipboard",
    version: "^1.10.0",
  },
  "datetime-picker": {
    name: "@react-native-community/datetimepicker",
    version: "^6.0.2",
  },
  gestures: {
    name: "react-native-gesture-handler",
    version: "^2.3.2",
  },
  hermes: {
    name: "hermes-engine",
    version: "~0.11.0",
  },
  metro: {
    name: "metro",
    version: "^0.67.0",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.67.0",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.67.0",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.67.0",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.67.0",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.67.0",
    devOnly: true,
  },
  screens: {
    name: "react-native-screens",
    version: "^3.13.1",
  },
  storage: {
    name: "@react-native-async-storage/async-storage",
    version: "^1.17.3",
  },
  svg: {
    name: "react-native-svg",
    version: "^12.3.0",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^1.3.5",
    devOnly: true,
  },
  webview: {
    name: "react-native-webview",
    version: "^11.22.6",
  },
};

export default profile;

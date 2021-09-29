import type { Profile, Package } from "../types";
import profile_0_64 from "./profile-0.64";

const reactNative: Package = {
  name: "react-native",
  version: "^0.65.1",
  capabilities: ["react"],
};

const profile: Profile = {
  ...profile_0_64,
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
    version: "^0.65.0-0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.65.0-0",
    capabilities: ["core"],
  },

  animation: {
    name: "react-native-reanimated",
    version: "^2.2.1",
  },
  clipboard: {
    name: "@react-native-clipboard/clipboard",
    version: "^1.8.4",
  },
  "datetime-picker": {
    name: "@react-native-community/datetimepicker",
    version: "^3.5.2",
  },
  filesystem: {
    name: "react-native-fs",
    version: "^2.18.0",
  },
  "floating-action": {
    name: "react-native-floating-action",
    version: "^1.22.0",
  },
  hermes: {
    name: "hermes-engine",
    version: "~0.8.1",
  },
  "masked-view": {
    name: "@react-native-masked-view/masked-view",
    version: "^0.2.6",
  },
  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.66.0",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.66.0",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.66.0",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.66.0",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.66.0",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.66.0",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.66.0",
    devOnly: true,
  },
  modal: {
    name: "react-native-modal",
    version: "^13.0.0",
  },
  screens: {
    name: "react-native-screens",
    version: "^3.7.0",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^0.7.6",
    devOnly: true,
  },
  webview: {
    name: "react-native-webview",
    version: "^11.13.0",
  },
  jest: {
    name: "jest",
    version: "^26.6.3",
    devOnly: true,
  },
};

export default profile;

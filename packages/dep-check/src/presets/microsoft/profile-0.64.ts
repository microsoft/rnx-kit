import type { Package, Profile } from "../../types";
import profile63 from "./profile-0.63";

const reactNative: Package = {
  name: "react-native",
  version: "^0.64.2",
  capabilities: ["react"],
};

const profile: Profile = {
  ...profile63,
  react: {
    name: "react",
    version: "17.0.1",
  },
  "react-dom": {
    name: "react-dom",
    version: "17.0.1",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "17.0.1",
    capabilities: ["react"],
    devOnly: true,
  },

  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.64.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.64.0",
    capabilities: ["core"],
  },

  animation: {
    name: "react-native-reanimated",
    version: "^2.1.0",
  },
  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.64.0",
    devOnly: true,
  },
  base64: {
    name: "react-native-base64",
    version: "^0.2.1",
  },
  checkbox: {
    name: "@react-native-community/checkbox",
    version: "^0.5.8",
  },
  clipboard: {
    name: "@react-native-clipboard/clipboard",
    version: "^1.8.3",
  },
  "datetime-picker": {
    name: "@react-native-community/datetimepicker",
    version: "^3.4.6",
  },
  filesystem: {
    name: "react-native-fs",
    version: "^2.17.0",
  },
  "floating-action": {
    name: "react-native-floating-action",
    version: "^1.21.0",
  },
  gestures: {
    name: "react-native-gesture-handler",
    version: "^1.10.3",
  },
  hermes: {
    name: "hermes-engine",
    version: "~0.7.0",
  },
  hooks: {
    name: "@react-native-community/hooks",
    version: "^2.6.0",
  },
  html: {
    name: "react-native-render-html",
    version: "^5.1.1",
  },
  jest: {
    name: "jest",
    version: "^26.5.2",
    devOnly: true,
  },
  "lazy-index": {
    name: "react-native-lazy-index",
    version: "^2.1.1",
  },
  "masked-view": {
    name: "@react-native-masked-view/masked-view",
    version: "^0.2.4",
  },
  metro: {
    name: "metro",
    version: "^0.64.0",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.64.0",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.64.0",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.64.0",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.64.0",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.64.0",
    devOnly: true,
  },
  modal: {
    name: "react-native-modal",
    version: "^11.10.0",
  },
  "navigation/native": {
    name: "@react-navigation/native",
    version: "^5.9.8",
  },
  "navigation/stack": {
    name: "@react-navigation/stack",
    version: "^5.14.9",
    capabilities: ["navigation/native"],
  },
  netinfo: {
    name: "@react-native-community/netinfo",
    version: "^6.0.2",
  },
  popover: {
    name: "react-native-popover-view",
    version: "^4.0.3",
  },
  "safe-area": {
    name: "react-native-safe-area-context",
    version: "^3.2.0",
  },
  screens: {
    name: "react-native-screens",
    version: "^3.1.1",
  },
  shimmer: {
    name: "react-native-shimmer",
    version: "^0.5.0",
  },
  sqlite: {
    name: "react-native-sqlite-storage",
    version: "^5.0.0",
  },
  storage: {
    name: "@react-native-async-storage/async-storage",
    version: "^1.15.8",
  },
  svg: {
    name: "react-native-svg",
    version: "^12.1.1",
  },
  webview: {
    name: "react-native-webview",
    version: "^11.4.2",
  },
};

export default profile;

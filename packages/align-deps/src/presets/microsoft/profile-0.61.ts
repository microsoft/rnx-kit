import type { Package, Profile } from "../../types";
import baseCapabilities from "./baseCapabilities";

const reactNative: Package = {
  name: "react-native",
  version: "^0.61.5",
  capabilities: ["react"],
};

const profile: Profile = {
  ...baseCapabilities,
  react: {
    name: "react",
    version: "16.9.0",
  },
  "react-dom": {
    name: "react-dom",
    version: "16.9.0",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "16.9.0",
    capabilities: ["react"],
    devOnly: true,
  },

  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.61.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.61.0",
    capabilities: ["core"],
  },

  animation: {
    name: "react-native-reanimated",
    version: "^1.13.3",
  },
  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.56.0",
    devOnly: true,
  },
  base64: {
    name: "react-native-base64",
    version: "^0.2.1",
  },
  checkbox: {
    name: "@react-native-community/checkbox",
    version: "^0.5.7",
  },
  clipboard: {
    name: "@react-native-community/clipboard",
    version: "^1.5.1",
  },
  "datetime-picker": {
    name: "@react-native-community/datetimepicker",
    version: "^3.0.9",
  },
  filesystem: {
    name: "react-native-fs",
    version: "^2.16.6",
  },
  "floating-action": {
    name: "react-native-floating-action",
    version: "^1.18.0",
  },
  gestures: {
    name: "react-native-gesture-handler",
    version: "^1.9.0",
  },
  hermes: {
    name: "hermes-engine",
    version: "^0.2.1",
  },
  hooks: {
    name: "@react-native-community/hooks",
    version: "^2.6.0",
  },
  html: {
    name: "react-native-render-html",
    version: "^5.1.0",
  },
  jest: {
    name: "jest",
    version: "^24.8.0",
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
    version: "^0.56.0",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.56.0",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.56.0",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.56.0",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.56.0",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.56.0",
    devOnly: true,
  },
  modal: {
    name: "react-native-modal",
    version: "^11.5.6",
  },
  "navigation/native": {
    name: "@react-navigation/native",
    version: "^5.7.6",
  },
  "navigation/stack": {
    name: "@react-navigation/stack",
    version: "^5.9.3",
    capabilities: ["navigation/native"],
  },
  netinfo: {
    name: "@react-native-community/netinfo",
    version: "^5.7.1",
  },
  popover: {
    name: "react-native-popover-view",
    version: "^3.1.1",
  },
  "safe-area": {
    name: "react-native-safe-area-context",
    version: "^3.1.9",
  },
  screens: {
    name: "react-native-screens",
    version: "^2.10.1",
  },
  shimmer: {
    name: "react-native-shimmer",
    version: "^0.5.0",
  },
  sqlite: {
    name: "react-native-sqlite-storage",
    version: "^3.3.11",
  },
  storage: {
    name: "@react-native-community/async-storage",
    version: "^1.12.1",
  },
  svg: {
    name: "react-native-svg",
    version: "^12.1.1",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^0.11.4",
    devOnly: true,
  },
  webview: {
    name: "react-native-webview",
    version: "^11.0.3",
  },
};

export default profile;

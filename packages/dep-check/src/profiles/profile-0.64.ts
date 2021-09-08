import type { Profile } from "../types";

const reactNative = {
  name: "react-native",
  version: "^0.64.2",
};

const profile: Profile = {
  react: {
    name: "react",
    version: "17.0.1",
  },
  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.64.0",
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
    version: "^1.7.3",
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
    version: "^5.1.0",
  },
  "lazy-index": {
    name: "react-native-lazy-index",
    version: "^2.1.1",
  },
  "masked-view": {
    name: "@react-native-masked-view/masked-view",
    version: "^0.2.4",
  },
  modal: {
    name: "react-native-modal",
    version: "^11.10.0",
  },
  "navigation/native": {
    name: "@react-navigation/native",
    version: "^5.9.4",
  },
  "navigation/stack": {
    name: "@react-navigation/stack",
    version: "^5.14.4",
    capabilities: ["navigation/native"],
  },
  netinfo: {
    name: "@react-native-community/netinfo",
    version: "^6.0.0",
  },
  popover: {
    name: "react-native-popover-view",
    version: "^4.0.0",
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
    version: "^1.15.5",
  },
  svg: {
    name: "react-native-svg",
    version: "^12.1.1",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^0.7.0",
    devOnly: true,
  },
  webview: {
    name: "react-native-webview",
    version: "^11.4.2",
  },
};

export default profile;

import type { Profile } from "../types";
import profile62 from "./profile-0.62";

const reactNative = {
  name: "react-native",
  version: "^0.63.2",
};

const profile: Profile = {
  ...profile62,

  react: {
    name: "react",
    version: "16.13.1",
  },
  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.63.0",
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.63.0",
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
    version: "~0.5.0",
  },
  "navigation/native": {
    name: "@react-navigation/native",
    version: "^5.9.4",
  },
  "navigation/stack": {
    name: "@react-navigation/stack",
    version: "^5.14.4",
  },
  "safe-area": {
    name: "react-native-safe-area-context",
    version: "^3.2.0",
  },
  screens: {
    name: "react-native-screens",
    version: "^2.18.1",
  },
  webview: {
    name: "react-native-webview",
    version: "^11.4.2",
  },
};

export default profile;

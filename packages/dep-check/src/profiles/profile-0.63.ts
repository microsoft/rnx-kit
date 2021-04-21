import profile62 from "./profile-0.62";
import type { Profile } from "../types";

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
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.63.0",
  },
  "core-win32": {
    name: "@office-iss/react-native-win32",
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
  "navigation/native": {
    name: "@react-navigation/native",
    version: "^5.9.6",
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
  "test-app": {
    name: "react-native-test-app",
    version: "^0.5.5",
    devOnly: true,
  },
  webview: {
    name: "react-native-webview",
    version: "^11.4.2",
  },
};

export default profile;

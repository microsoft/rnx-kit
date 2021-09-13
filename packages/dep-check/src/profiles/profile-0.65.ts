import type { Profile } from "../types";
import profile_0_64 from "./profile-0.64";

const reactNative = {
  name: "react-native",
  version: "^0.65.0-0",
};

const profile: Profile = {
  ...profile_0_64,
  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.65.0-0",
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
  modal: {
    name: "react-native-modal",
    version: "^13.0.0",
  },
  react: {
    name: "react",
    version: "17.0.2",
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
};

export default profile;

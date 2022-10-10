import type { Package, Profile } from "../../types";
import profile_0_66 from "./profile-0.66";

const reactNative: Package = {
  name: "react-native",
  version: "^0.67.0",
  capabilities: ["react"],
};

const profile: Profile = {
  ...profile_0_66,
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
    version: "^0.67.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.67.0",
    capabilities: ["core"],
  },

  animation: {
    name: "react-native-reanimated",
    version: "^2.2.4",
  },
  storage: {
    name: "@react-native-async-storage/async-storage",
    version: "^1.15.16",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^1.1.7",
    devOnly: true,
  },
};

export default profile;

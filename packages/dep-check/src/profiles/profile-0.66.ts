import type { Profile } from "../types";
import profile_0_65 from "./profile-0.65";

const reactNative = {
  name: "react-native",
  version: "^0.66.0-0",
};

const profile: Profile = {
  ...profile_0_65,
  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.66.0-0",
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.66.0-0",
    capabilities: ["core"],
  },

  hermes: {
    name: "hermes-engine",
    version: "~0.9.0",
  },
  html: {
    name: "react-native-render-html",
    version: "^6.1.0",
  },
  react: {
    name: "react",
    version: "17.0.2",
  },
};

export default profile;

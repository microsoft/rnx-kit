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
  },
  hermes: {
    name: "hermes-engine",
    version: "~0.8.1",
  },
  react: {
    name: "react",
    version: "17.0.2",
  },
};

export default profile;

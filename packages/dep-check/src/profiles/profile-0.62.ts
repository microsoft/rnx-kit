import type { Profile } from "../types";
import profile61 from "./profile-0.61";

const reactNative = {
  name: "react-native",
  version: "^0.62.3",
};

const profile: Profile = {
  ...profile61,
  react: {
    name: "react",
    version: "16.11.0",
  },
  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.62.0",
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.62.0",
    capabilities: ["core"],
  },
  hermes: {
    name: "hermes-engine",
    version: "~0.4.0",
  },
  netinfo: {
    name: "@react-native-community/netinfo",
    version: "^5.9.10",
  },
};

export default profile;

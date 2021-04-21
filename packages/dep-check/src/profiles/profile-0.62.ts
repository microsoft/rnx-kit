import profile61 from "./profile-0.61";
import type { Profile } from "../types";

const reactNative = {
  name: "react-native",
  version: "^0.62.2",
};

const profile: Profile = {
  ...profile61,
  react: {
    name: "react",
    version: "16.11.0",
  },
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.62.0",
  },
  "core-win32": {
    name: "@office-iss/react-native-win32",
    version: "^0.62.0",
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.62.0",
  },
};

export default profile;

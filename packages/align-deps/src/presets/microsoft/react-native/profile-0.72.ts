import type { Package, Profile } from "../../../types";
import profile_0_71 from "./profile-0.71";

const reactNative: Package = {
  name: "react-native",
  version: "^0.72.0",
  capabilities: ["react"],
};

const profile: Profile = {
  ...profile_0_71,
  react: {
    name: "react",
    version: "18.2.0",
  },
  "react-dom": {
    name: "react-dom",
    version: "^18.2.0",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "18.2.0",
    capabilities: ["react"],
    devOnly: true,
  },

  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.72.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.72.0",
    capabilities: ["core"],
  },

  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.76.0",
    devOnly: true,
  },
  "community/cli": {
    name: "@react-native-community/cli",
    version: "^11.0.0",
    capabilities: ["community/cli-android", "community/cli-ios"],
    devOnly: true,
  },
  "community/cli-android": {
    name: "@react-native-community/cli-platform-android",
    version: "^11.0.0",
    devOnly: true,
  },
  "community/cli-ios": {
    name: "@react-native-community/cli-platform-ios",
    version: "^11.0.0",
    devOnly: true,
  },
  metro: {
    name: "metro",
    version: "^0.76.0",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.76.0",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.76.0",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.76.0",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.76.0",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.76.0",
    devOnly: true,
  },

  animation: {
    name: "react-native-reanimated",
    version: "^3.0.2",
  },
  "datetime-picker": {
    name: "@react-native-community/datetimepicker",
    version: "^7.0.0",
  },
  "safe-area": {
    name: "react-native-safe-area-context",
    version: "^4.5.3",
  },
  storage: {
    name: "@react-native-async-storage/async-storage",
    version: "^1.18.1",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^2.5.3",
    devOnly: true,
  },
};

export default profile;

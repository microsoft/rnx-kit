import type { Profile, Package } from "../../types";
import profile_0_69 from "./profile-0.69";

const reactNative: Package = {
  name: "react-native",
  version: "^0.70.0",
  capabilities: ["react"],
};

const profile: Profile = {
  ...profile_0_69,
  react: {
    name: "react",
    version: "18.1.0",
  },
  "react-dom": {
    name: "react-dom",
    version: "^18.1.0",
    capabilities: ["react"],
  },
  "react-test-renderer": {
    name: "react-test-renderer",
    version: "18.1.0",
    capabilities: ["react"],
    devOnly: true,
  },

  core: reactNative,
  "core-android": reactNative,
  "core-ios": reactNative,
  "core-macos": {
    name: "react-native-macos",
    version: "^0.70.0",
    capabilities: ["react"],
  },
  "core-windows": {
    name: "react-native-windows",
    version: "^0.70.0",
    capabilities: ["core"],
  },

  animation: {
    name: "react-native-reanimated",
    version: "^2.10.0",
  },
  "babel-preset-react-native": {
    name: "metro-react-native-babel-preset",
    version: "^0.72.1",
    devOnly: true,
  },
  "datetime-picker": {
    name: "@react-native-community/datetimepicker",
    version: "^6.3.3",
  },
  gestures: {
    name: "react-native-gesture-handler",
    version: "^2.6.0",
  },
  metro: {
    name: "metro",
    version: "^0.72.1",
    devOnly: true,
  },
  "metro-config": {
    name: "metro-config",
    version: "^0.72.1",
    devOnly: true,
  },
  "metro-core": {
    name: "metro-core",
    version: "^0.72.1",
    devOnly: true,
  },
  "metro-react-native-babel-transformer": {
    name: "metro-react-native-babel-transformer",
    version: "^0.72.1",
    devOnly: true,
  },
  "metro-resolver": {
    name: "metro-resolver",
    version: "^0.72.1",
    devOnly: true,
  },
  "metro-runtime": {
    name: "metro-runtime",
    version: "^0.72.1",
    devOnly: true,
  },
  netinfo: {
    name: "@react-native-community/netinfo",
    version: "^9.0.0",
  },
  "safe-area": {
    name: "react-native-safe-area-context",
    version: "^4.4.1",
  },
  screens: {
    name: "react-native-screens",
    version: "^3.18.2",
  },
  storage: {
    name: "@react-native-async-storage/async-storage",
    version: "^1.17.10",
  },
  "test-app": {
    name: "react-native-test-app",
    version: "^1.6.9",
    devOnly: true,
  },
};

export default profile;

import type { Capability } from "@rnx-kit/config";
import type { Profile } from "../../../types";
import profile_0_70 from "../../microsoft/react-native/profile-0.70";

const profile: Profile = {
  ...profile_0_70,
  animation: {
    name: "react-native-reanimated",
    version: "^3.0.0-0",
  },
  // @ts-expect-error 'blur' is not a known capability
  blur: {
    name: "@react-native-community/blur",
    version: "^4.3.0",
  },
  // gestures: already in the default profile
  "linear-gradient": {
    name: "rnx-gradient",
    version: "^0.1.0",
  },
  // safe-area: already in the default profile
  // screens: already in the default profile
  slider: {
    name: "react-native-slider",
    version: "^4.3.1",
  },
  svg: {
    name: "react-native-svg",
    version: "^13.5.0",
  },
  // "test-app": already in the default profile,
};

const unsupportedCapabilities: Capability[] = [
  "base64",
  "checkbox",
  "clipboard",
  "datetime-picker",
  "filesystem",
  "floating-action",
  "html",
  "masked-view",
  "modal",
  "navigation/native",
  "navigation/stack",
  "netinfo",
  "popover",
  "shimmer",
  "sqlite",
  "storage",
  "webview",
];

unsupportedCapabilities.forEach((capability) => {
  delete profile[capability];
});

export default profile;

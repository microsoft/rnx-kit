/** @jsxRuntime classic */
/** @jsx withSlots */
import { View } from "react-native";

import { compose } from "@fluentui-react-native/framework";
import { Icon } from "@fluentui-react-native/icon";
import { TextV1 as Text } from "rnx-test-repo-text";

import type { ToggleButtonType } from "./ToggleButton.types";
import { toggleButtonName } from "./ToggleButton.types";

export const ToggleButton = compose<ToggleButtonType>({
  displayName: toggleButtonName,
  slots: {
    root: View,
    icon: Icon,
    content: Text,
  },
  useRender: () => {
    return () => {
      console.warn("Toggle Button is not implemented for Android");
      return null;
    };
  },
});

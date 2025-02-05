/** @jsxRuntime classic */
/** @jsx withSlots */
import { View } from "react-native";

import { compose } from "@fluentui-react-native/framework";
import { Icon } from "@fluentui-react-native/icon";
import { Text } from "@rnx-repo-yarn-pnpm/text";

import type { CompoundButtonType } from "./CompoundButton.types";
import { compoundButtonName } from "./CompoundButton.types";

export const CompoundButton = compose<CompoundButtonType>({
  displayName: compoundButtonName,
  slots: {
    root: View,
    icon: Icon,
    content: Text,
    secondaryContent: Text,
    contentContainer: View,
  },
  useRender: () => {
    return () => {
      console.warn("Compound Button is not implemented on Android/iOS");
      return null;
    };
  },
});

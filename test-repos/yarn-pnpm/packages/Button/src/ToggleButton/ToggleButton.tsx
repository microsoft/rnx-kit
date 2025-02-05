/** @jsxRuntime classic */
/** @jsx withSlots */
import * as React from "react";
import { Platform, Pressable, View } from "react-native";

import { ActivityIndicator } from "@fluentui-react-native/experimental-activity-indicator";
import {
  type UseSlots,
  compose,
  mergeProps,
  withSlots,
} from "@fluentui-react-native/framework";
import { Icon, createIconProps } from "@fluentui-react-native/icon";
import { TextV1 as Text } from "@rnx-repo-yarn-pnpm/text";

import { buttonLookup, getFocusBorderStyle } from "../Button";
import { stylingSettings } from "./ToggleButton.styling";
import type { ToggleButtonProps, ToggleButtonType } from "./ToggleButton.types";
import { toggleButtonName } from "./ToggleButton.types";
import { useToggleButton } from "./useToggleButton";

export const ToggleButton = compose<ToggleButtonType>({
  displayName: toggleButtonName,
  ...stylingSettings,
  slots: {
    root: Pressable,
    icon: Icon,
    content: Text,
    focusInnerBorder: (Platform.OS === ("win32" as any) && View) || undefined,
  },
  useRender: (
    userProps: ToggleButtonProps,
    useSlots: UseSlots<ToggleButtonType>
  ) => {
    const iconProps = createIconProps(userProps.icon!);
    const toggleButton = useToggleButton(userProps);

    // grab the styled slots
    const Slots = useSlots(userProps, (layer) =>
      buttonLookup(layer, toggleButton.state, userProps)
    );

    // now return the handler for finishing render
    return (final: ToggleButtonProps, ...children: React.ReactNode[]) => {
      const {
        icon,
        iconPosition,
        iconOnly,
        loading,
        accessibilityLabel,
        ...mergedProps
      } = mergeProps(toggleButton.props, final);
      const shouldShowIcon = !loading && icon;

      if (__DEV__ && iconOnly) {
        React.Children.forEach(children, (child) => {
          if (typeof child === "string") {
            console.warn("iconOnly should not be set when Button has content.");
          }
        });
      }

      let childText = "";
      if (accessibilityLabel === undefined) {
        React.Children.forEach(children, (child) => {
          if (typeof child === "string") {
            childText = child; // We only automatically support the one child string.
          }
        });
      }
      const label = accessibilityLabel ?? childText;

      return (
        <Slots.root {...mergedProps} accessibilityLabel={label}>
          {loading && <ActivityIndicator />}
          {shouldShowIcon && iconPosition === "before" && (
            <Slots.icon {...iconProps} accessible={false} />
          )}
          {React.Children.map(children, (child) =>
            typeof child === "string" ? (
              <Slots.content accessible={false} key="content">
                {child}
              </Slots.content>
            ) : (
              child
            )
          )}
          {shouldShowIcon && iconPosition === "after" && (
            <Slots.icon {...iconProps} accessible={false} />
          )}
          {toggleButton.state.focused &&
            !!toggleButton.state.measuredHeight &&
            !!toggleButton.state.measuredWidth &&
            toggleButton.state.shouldUseTwoToneFocusBorder &&
            Slots.focusInnerBorder && (
              <Slots.focusInnerBorder
                style={getFocusBorderStyle(
                  toggleButton.state.measuredHeight,
                  toggleButton.state.measuredWidth
                )}
                accessible={false}
                focusable={false}
              />
            )}
        </Slots.root>
      );
    };
  },
});

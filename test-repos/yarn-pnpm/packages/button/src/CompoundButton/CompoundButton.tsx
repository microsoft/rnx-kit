/** @jsxRuntime classic */
/** @jsx withSlots */
import * as React from "react";
import { Platform, Pressable, View } from "react-native";

import { ActivityIndicator } from "@fluentui-react-native/experimental-activity-indicator";
import type { UseSlots } from "@fluentui-react-native/framework";
import {
  compose,
  mergeProps,
  withSlots,
} from "@fluentui-react-native/framework";
import { Icon, createIconProps } from "@fluentui-react-native/icon";
import { Text } from "@rnx-repo-yarn-pnpm/text";

import { buttonLookup, getFocusBorderStyle } from "../Button";
import { useButton } from "../useButton";
import { stylingSettings } from "./CompoundButton.styling";
import type {
  CompoundButtonProps,
  CompoundButtonType,
} from "./CompoundButton.types";
import { compoundButtonName } from "./CompoundButton.types";

export const CompoundButton = compose<CompoundButtonType>({
  displayName: compoundButtonName,
  ...stylingSettings,
  slots: {
    root: Pressable,
    icon: Icon,
    content: Text,
    secondaryContent: Text,
    contentContainer: View,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    focusInnerBorder: Platform.OS === ("win32" as any) ? View : undefined,
  },
  useRender: (
    userProps: CompoundButtonProps,
    useSlots: UseSlots<CompoundButtonType>
  ) => {
    const button = useButton(userProps);
    const iconProps = createIconProps(userProps.icon!);

    // grab the styled slots
    const Slots = useSlots(userProps, (layer: string) =>
      buttonLookup(layer, button.state, userProps)
    );

    // now return the handler for finishing render
    return (final: CompoundButtonProps, ...children: React.ReactNode[]) => {
      const {
        icon,
        iconOnly,
        secondaryContent,
        iconPosition,
        loading,
        accessibilityLabel,
        ...mergedProps
      } = mergeProps(button.props, final);

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

        if (secondaryContent) {
          childText += " " + secondaryContent;
        }
      }
      const label = accessibilityLabel ?? childText;

      return (
        <Slots.root {...mergedProps} accessibilityLabel={label}>
          {loading && <ActivityIndicator />}
          {shouldShowIcon && iconPosition === "before" && (
            <Slots.icon {...iconProps} accessible={false} />
          )}
          <Slots.contentContainer>
            {React.Children.map(children, (child) =>
              typeof child === "string" ? (
                <Slots.content accessible={false} key="content">
                  {child}
                </Slots.content>
              ) : (
                child
              )
            )}
            {secondaryContent && (
              <Slots.secondaryContent accessible={false} key="secondaryContent">
                {secondaryContent}
              </Slots.secondaryContent>
            )}
          </Slots.contentContainer>
          {shouldShowIcon && iconPosition === "after" && (
            <Slots.icon {...iconProps} accessible={false} />
          )}
          {button.state.focused &&
            !!button.state.measuredHeight &&
            !!button.state.measuredWidth &&
            button.state.shouldUseTwoToneFocusBorder &&
            Slots.focusInnerBorder && (
              <Slots.focusInnerBorder
                style={getFocusBorderStyle(
                  button.state.measuredHeight,
                  button.state.measuredWidth
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

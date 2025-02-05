/** @jsxRuntime classic */
/** @jsx withSlots */
import * as React from "react";
import { Platform, Pressable, View } from "react-native";

import { Shadow } from "@fluentui-react-native/experimental-shadow";
import {
  type UseSlots,
  compose,
  mergeProps,
  withSlots,
} from "@fluentui-react-native/framework";
import { Icon, createIconProps } from "@fluentui-react-native/icon";
import type { IPressableState } from "@fluentui-react-native/interactive-hooks";
import { TextV1 as Text } from "rnx-test-repo-text";

import { extractOuterStylePropsAndroid } from "../ExtractStyle.android";
import { useButton } from "../useButton";
import { stylingSettings } from "./FAB.styling";
import type { FABProps, FABType } from "./FAB.types";
import { fabName } from "./FAB.types";

/**
 * A function which determines if a set of styles should be applied to the component given the current state and props of the button.
 *
 * @param layer The name of the state that is being checked for
 * @param state The current state of the button
 * @param userProps The props that were passed into the button
 * @returns Whether the styles that are assigned to the layer should be applied to the button
 */
const buttonLookup = (
  layer: string,
  state: IPressableState,
  userProps: FABProps
): boolean => {
  return Boolean(
    layer === userProps["appearance"] ||
      state[layer as keyof IPressableState] ||
      userProps[layer as keyof FABProps] ||
      layer === userProps["size"] ||
      (!userProps["size"] && layer === "large") ||
      (layer === "hasContent" &&
        !userProps.iconOnly &&
        (userProps.showContent == undefined ? true : userProps.showContent))
  );
};

export const FAB = compose<FABType>({
  displayName: fabName,
  ...stylingSettings,
  slots: {
    root: Pressable,
    icon: Icon,
    content: Text,
    rippleContainer: View,
    shadow: Shadow,
  },
  useRender: (userProps: FABProps, useSlots: UseSlots<FABType>) => {
    const { icon, ...rest } = userProps;

    const iconProps = createIconProps(userProps.icon);
    const button = useButton(rest);

    // grab the styled slots
    const Slots = useSlots(userProps, (layer) =>
      buttonLookup(layer, button.state, userProps)
    );

    // now return the handler for finishing render
    return (final: FABProps, ...children: React.ReactNode[]) => {
      const {
        iconOnly,
        accessibilityLabel,
        showContent = true,
        ...mergedProps
      } = mergeProps(button.props, final);

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

      const buttonContent = (
        <React.Fragment>
          {icon && <Slots.icon {...iconProps} accessible={false} />}
          {showContent &&
            React.Children.map(children, (child) =>
              typeof child === "string" ? (
                <Slots.content accessible={false} key="content">
                  {child}
                </Slots.content>
              ) : (
                child
              )
            )}
        </React.Fragment>
      );
      const buttonContentWithRoot = (
        <Slots.root {...mergedProps} accessibilityLabel={label}>
          {buttonContent}
        </Slots.root>
      );

      const hasShadow = Platform.OS === "ios";
      const hasRipple = Platform.OS === "android";

      if (hasShadow && Slots.shadow) {
        return <Slots.shadow>{buttonContentWithRoot}</Slots.shadow>;
      } else if (hasRipple && Slots.rippleContainer) {
        const [outerStyleProps, innerStyleProps] =
          extractOuterStylePropsAndroid(mergedProps.style);
        return (
          <Slots.rippleContainer style={outerStyleProps}>
            <Slots.root
              accessibilityLabel={label}
              {...mergedProps}
              style={innerStyleProps}
            >
              {buttonContent}
            </Slots.root>
          </Slots.rippleContainer>
        );
      } else {
        return buttonContentWithRoot;
      }
    };
  },
});

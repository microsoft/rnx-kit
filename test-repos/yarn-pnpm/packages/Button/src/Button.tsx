/** @jsxRuntime classic */
/** @jsx withSlots */
import React from "react";
import { Platform, Pressable, View } from "react-native";

import { ActivityIndicator } from "@fluentui-react-native/experimental-activity-indicator";
import type { UseSlots } from "@fluentui-react-native/framework";
import {
  compose,
  memoize,
  mergeProps,
  withSlots,
} from "@fluentui-react-native/framework";
import { Icon, createIconProps } from "@fluentui-react-native/icon";
import type { IPressableState } from "@fluentui-react-native/interactive-hooks";
import { Text } from "@rnx-repo-yarn-pnpm/text";

import {
  getDefaultSize,
  getPlatformSpecificAppearance,
  stylingSettings,
} from "./Button.styling";
import type { ButtonProps, ButtonType } from "./Button.types";
import { buttonName } from "./Button.types";
import { extractOuterStylePropsAndroid } from "./ExtractStyle.android";
import { useButton } from "./useButton";

/**
 * A function which determines if a set of styles should be applied to the component given the current state and props of the button.
 *
 * @param layer The name of the state that is being checked for
 * @param state The current state of the button
 * @param userProps The props that were passed into the button
 * @returns Whether the styles that are assigned to the layer should be applied to the button
 */
export const buttonLookup = (
  layer: string,
  state: IPressableState,
  userProps: ButtonProps
): boolean => {
  return Boolean(
    state[layer as keyof IPressableState] ||
      userProps[layer as keyof ButtonProps] ||
      layer === getPlatformSpecificAppearance(userProps["appearance"]!) ||
      layer === userProps["size"] ||
      (!userProps["size"] && layer === getDefaultSize()) ||
      layer === userProps["shape"] ||
      (!userProps["shape"] && layer === "rounded") ||
      (layer === "hovered" && state[layer] && !userProps.loading) ||
      (layer === "hasContent" && !userProps.iconOnly) ||
      (layer === "hasIconAfter" &&
        (userProps.icon || userProps.loading) &&
        userProps.iconPosition === "after") ||
      (layer === "hasIconBefore" &&
        (userProps.icon || userProps.loading) &&
        (!userProps.iconPosition || userProps.iconPosition === "before"))
  );
};

export const Button = compose<ButtonType>({
  displayName: buttonName,
  ...stylingSettings,
  slots: {
    root: Pressable,
    rippleContainer: Platform.OS === "android" && (View as any),
    focusInnerBorder: Platform.OS === ("win32" as any) && (View as any),
    icon: Icon,
    content: Text,
  },
  useRender: (userProps: ButtonProps, useSlots: UseSlots<ButtonType>) => {
    const button = useButton(userProps);

    const iconProps = createIconProps(userProps.icon!);
    // grab the styled slots
    const Slots = useSlots(userProps, (layer: string) =>
      buttonLookup(layer, button.state, userProps)
    );

    // now return the handler for finishing render
    return (final: ButtonProps, ...children: React.ReactNode[]) => {
      const {
        icon,
        iconOnly,
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
      }

      const label = accessibilityLabel ?? childText;
      const buttonContent = (
        <React.Fragment>
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
        </React.Fragment>
      );

      const hasRipple = Platform.OS === "android";
      if (hasRipple && Slots.rippleContainer) {
        const [outerStyleProps, innerStyleProps] =
          extractOuterStylePropsAndroid(mergedProps.style);
        return (
          <Slots.rippleContainer style={outerStyleProps}>
            {/* RN Pressable needs to be wrapped with a root view to support curved edges */}
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
        return (
          <Slots.root {...mergedProps} accessibilityLabel={label}>
            {buttonContent}
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
      }
    };
  },
});

const getFocusBorderStyleWorker = (height: number, width: number) => {
  const adjustment = 2; // width of border * 2

  return {
    height: height - adjustment,
    width: width - adjustment,
  };
};
export const getFocusBorderStyle = memoize(getFocusBorderStyleWorker);

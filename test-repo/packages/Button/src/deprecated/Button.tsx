/** @jsxRuntime classic */
/** @jsx withSlots */
import * as React from "react";
import { View } from "react-native";

import { filterViewProps } from "@fluentui-react-native/adapters";
import { Icon, createIconProps } from "@fluentui-react-native/icon";
import {
  useAsPressable,
  useKeyProps,
  useOnPressWithFocus,
  useViewCommandFocus,
} from "@fluentui-react-native/interactive-hooks";
import {
  backgroundColorTokens,
  borderTokens,
  foregroundColorTokens,
  getPaletteFromTheme,
  textTokens,
} from "@fluentui-react-native/tokens";
import type { ISlots } from "@uifabricshared/foundation-composable";
import type { IUseComposeStyling } from "@uifabricshared/foundation-compose";
import { compose } from "@uifabricshared/foundation-compose";
import { mergeSettings } from "@uifabricshared/foundation-settings";
import { Text } from "rnx-test-repo-text";

import { settings } from "./Button.settings";
import type {
  IButtonProps,
  IButtonRenderData,
  IButtonSlotProps,
  IButtonState,
  IButtonType,
} from "./Button.types";
import { buttonName } from "./Button.types";

/**
 * @deprecated This component is deprecated in favor of ButtonV1. This Button will be removed when the package moves to 1.0.0.
 * At that point, ButtonV1 will be renamed to Button. Please see MIGRATION.md for details on how to move to the new Button.
 */
export const Button = compose<IButtonType>({
  displayName: buttonName,
  usePrepareProps: (
    userProps: IButtonProps,
    useStyling: IUseComposeStyling<IButtonType>
  ) => {
    const defaultComponentRef = React.useRef(null);
    const {
      icon,
      startIcon,
      endIcon,
      content,
      onAccessibilityTap = userProps.onClick,
      accessibilityLabel = userProps.content,
      componentRef = defaultComponentRef,
      testID,
      onClick,
      ...rest
    } = userProps;

    // Ensure focus is placed on button after click
    const onPressWithFocus = useOnPressWithFocus(componentRef, onClick);
    // attach the pressable state handlers
    const pressable = useAsPressable({ ...rest, onPress: onPressWithFocus });
    const onKeyProps = useKeyProps(onClick, " ", "Enter");
    // set up state
    const state: IButtonState = {
      info: {
        ...pressable.state,
        disabled: !!userProps.disabled,
        content: !!content,
        startIcon: !!startIcon || !!icon,
        endIcon: !!endIcon,
      },
    };

    const buttonRef = useViewCommandFocus(componentRef);
    // grab the styling information, referencing the state as well as the props
    const styleProps = useStyling(
      userProps,
      (override: string) => state.info[override] || userProps[override]
    );
    // create the merged slot props

    const slotProps = mergeSettings<IButtonSlotProps>(styleProps, {
      root: {
        ...pressable.props,
        ref: buttonRef,
        onAccessibilityTap: onAccessibilityTap,
        accessibilityLabel: accessibilityLabel,
        accessibilityState: { disabled: state.info.disabled },
        ...onKeyProps,
        testID,
      },
      content: { children: content },
      startIcon: createIconProps(startIcon || icon),
      endIcon: createIconProps(endIcon),
    });

    return { slotProps, state };
  },
  settings,
  render: (
    Slots: ISlots<IButtonSlotProps>,
    renderData: IButtonRenderData,
    ...children: React.ReactNode[]
  ) => {
    const info = renderData.state!.info;

    return (
      <Slots.root>
        <Slots.borderWrapper>
          <Slots.stack>
            {info.startIcon && <Slots.startIcon />}
            {info.content && <Slots.content />}
            {children}
            {info.endIcon && <Slots.endIcon />}
          </Slots.stack>
        </Slots.borderWrapper>
      </Slots.root>
    );
  },
  slots: {
    root: View,
    stack: { slotType: View, filter: filterViewProps },
    borderWrapper: { slotType: View, filter: filterViewProps },
    startIcon: { slotType: Icon as React.ComponentType },
    content: Text,
    endIcon: { slotType: Icon as React.ComponentType },
  },
  styles: {
    root: [backgroundColorTokens, borderTokens],
    stack: [],
    borderWrapper: [
      {
        source: "wrapperBorderColor",
        lookup: getPaletteFromTheme,
        target: "borderColor",
      },
    ],
    startIcon: [
      { source: "iconColor", lookup: getPaletteFromTheme, target: "color" },
    ],
    content: [textTokens, foregroundColorTokens],
    endIcon: [
      { source: "iconColor", lookup: getPaletteFromTheme, target: "color" },
    ],
  },
});

export default Button;

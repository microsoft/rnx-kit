/** @jsxRuntime classic */
/** @jsx withSlots */
import React from "react";
import {
  I18nManager,
  Platform,
  Text as RNText,
  type GestureResponderEvent,
} from "react-native";

import type {
  FontWeightValue,
  UseTokens,
} from "@fluentui-react-native/framework";
import {
  compressible,
  fontStyles,
  mergeStyles,
  patchTokens,
  useFluentTheme,
  withSlots,
} from "@fluentui-react-native/framework";
import { useKeyProps } from "@fluentui-react-native/interactive-hooks";
import { globalTokens } from "@fluentui-react-native/theme-tokens";

import type { TextProps, TextTokens } from "./Text.types";
import { textName } from "./Text.types";
import { useTextTokens } from "./TextTokens";

const emptyProps = {};
export const Text = compressible<TextProps, TextTokens>(
  (props: TextProps, useTokens: UseTokens<TextTokens>) => {
    if (props === undefined) {
      props = emptyProps;
    }

    // split out color and variant from props
    const {
      align = undefined,
      block,
      color,
      componentRef,
      font,
      italic,
      numberOfLines,
      onAccessibilityTap,
      onKeyUp,
      onKeyDown,
      keyUpEvents,
      keyDownEvents,
      onPress,
      size,
      strikethrough,
      style,
      truncate = false,
      underline,
      variant,
      weight,
      wrap = true,
      ...rest
    } = props;
    const theme = useFluentTheme();
    // get the tokens from the theme
    let [tokens, cache] = useTokens(theme);

    const textAlign = I18nManager.isRTL
      ? align === "start"
        ? "right"
        : align === "end"
          ? "left"
          : align
      : align === "start"
        ? "left"
        : align === "end"
          ? "right"
          : align;

    const textOnPress = React.useCallback(
      (e: GestureResponderEvent) => {
        if (onPress) {
          onPress(e);
        }
        e.stopPropagation();
      },
      [onPress]
    );
    const keyProps = useKeyProps(textOnPress, " ", "Enter");

    const onAccTap = React.useCallback(
      (event?: GestureResponderEvent) => {
        onAccessibilityTap
          ? onAccessibilityTap()
          : onPress && event
            ? onPress(event)
            : undefined;
      },
      [onPress, onAccessibilityTap]
    );

    // override tokens from props
    [tokens, cache] = patchTokens(tokens, cache, {
      color,
      variant,
      fontFamily: font == "base" ? "primary" : font,
      fontMaximumSize: tokens.maximumFontSize,
      fontSize: globalTokens.font[
        ("size" + size) as keyof typeof globalTokens.font
      ] as number,
      fontWeight: weight ? globalTokens.font.weight[weight as keyof typeof globalTokens.font.weight] as FontWeightValue : undefined,
      // leave it undefined for tokens to be set by user
      fontStyle: italic ? "italic" : undefined,
      textAlign: textAlign,
      textDecorationLine:
        underline && strikethrough
          ? "underline line-through"
          : underline
            ? "underline"
            : strikethrough
              ? "line-through"
              : undefined,
    });

    // now build the text style from tokens that can be shared between different Text instances
    const [tokenStyle] = cache(
      () => ({
        margin: 0,
        color: tokens.color,
        fontStyle: tokens.fontStyle,
        textAlign: tokens.textAlign,
        textDecorationLine: tokens.textDecorationLine,
        ...fontStyles.from(tokens, theme),
      }),
      [
        "color",
        "fontStyle",
        "textAlign",
        "textDecorationLine",
        ...fontStyles.keys,
      ]
    );

    // Safety measure: Dynamic Type is an iOS-specific thing
    const dynamicTypeVariant =
      Platform.OS === "ios" ? tokenStyle.dynamicTypeRamp : undefined;

    let maxFontSizeScaleAdjustment: TextProps = emptyProps;
    // tokenStyle.fontSize can also be a string (e.g., "14px").
    // Therefore, we only support scaling for number-based size values in order to avoid any messy calculations.
    if (
      dynamicTypeVariant !== undefined &&
      typeof tokenStyle.fontSize === "number" &&
      tokenStyle.maximumFontSize !== undefined
    ) {
      maxFontSizeScaleAdjustment = {
        maxFontSizeMultiplier: tokenStyle.maximumFontSize / tokenStyle.fontSize,
      };
    }

    const isWinPlatform =
      Platform.OS === ("win32" as typeof Platform.OS) ||
      Platform.OS === "windows";
    const filteredProps = {
      onKeyUp: isWinPlatform ? onKeyUp : undefined,
      keyUpEvents: isWinPlatform ? keyUpEvents : undefined,
      validKeysUp: undefined,
      onKeyDown: isWinPlatform ? onKeyDown : undefined,
      keyDownEvents: isWinPlatform ? keyDownEvents : undefined,
      validKeysDown: undefined,
      onAccessibilityTap: isWinPlatform ? onAccTap : undefined,
    };

    // return a continuation function that allows this text to be compressed
    // eslint-disable-next-line react/display-name
    return (extra: TextProps, children: React.ReactNode) => {
      const mergedProps = {
        ...rest,
        ...keyProps,
        ...filteredProps,
        ...extra,
        ...maxFontSizeScaleAdjustment,
        onPress,
        numberOfLines: numberOfLines ?? (truncate || !wrap ? 1 : 0),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        style: mergeStyles(tokenStyle, props.style as any, extra?.style as any),
      };

      // RN TextStyle doesn't recognize these properties.
      // Don't let them leak through or RN will complain about invalid props.
      delete (mergedProps.style as TextTokens).dynamicTypeRamp;
      delete (mergedProps.style as TextTokens).maximumFontSize;

      return (
        <RNText
          ref={componentRef}
          ellipsizeMode={!wrap && !truncate ? "clip" : "tail"}
          {...mergedProps}
        >
          {children}
        </RNText>
      );
    };
  },
  useTextTokens
);
Text.displayName = textName;

// eslint-disable-next-line no-restricted-exports
export default Text;

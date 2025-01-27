import type { Theme } from '@fluentui-react-native/framework';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { ButtonTokens } from './Button.types';

export const defaultButtonColorTokens: TokenSettings<ButtonTokens, Theme> = (t: Theme) =>
  ({
    backgroundColor: t.colors.buttonBackground,
    color: t.colors.buttonText,
    borderColor: t.colors.buttonBorder,
    iconColor: t.colors.buttonIcon,
    disabled: {
      backgroundColor: t.colors.defaultDisabledBackground,
      color: t.colors.defaultDisabledContent,
      borderColor: t.colors.defaultDisabledBorder,
      iconColor: t.colors.defaultDisabledIcon,
    },
    hovered: {
      backgroundColor: t.colors.defaultHoveredBackground,
      color: t.colors.defaultHoveredContent,
      borderColor: t.colors.defaultHoveredBorder,
      iconColor: t.colors.defaultHoveredIcon,
    },
    pressed: {
      backgroundColor: t.colors.defaultPressedBackground,
      color: t.colors.defaultPressedContent,
      borderColor: t.colors.defaultPressedBorder,
      iconColor: t.colors.defaultPressedIcon,
    },
    focused: {
      backgroundColor: t.colors.defaultFocusedBackground,
      color: t.colors.defaultFocusedContent,
      borderColor: t.colors.defaultFocusedBorder,
      icon: t.colors.defaultFocusedIcon,
    },
    primary: {
      backgroundColor: t.colors.brandBackground,
      color: t.colors.neutralForegroundOnColor,
      borderColor: t.colors.brandStroke1,
      iconColor: t.colors.neutralForegroundOnColor,
      disabled: {
        backgroundColor: t.colors.brandBackgroundDisabled,
        color: t.colors.neutralForegroundDisabled1,
        iconColor: t.colors.neutralForegroundDisabled1,
      },
      pressed: {
        backgroundColor: t.colors.brandBackgroundPressed,
        color: t.colors.neutralForegroundOnColor,
        iconColor: t.colors.neutralForegroundOnColor,
      },
      focused: {
        backgroundColor: t.colors.brandBackground,
        color: t.colors.neutralForegroundOnColor,
        borderColor: t.colors.strokeFocus2,
        iconColor: t.colors.neutralForegroundOnColor,
      },
    },
    subtle: {
      backgroundColor: t.colors.ghostBackground,
      color: t.colors.ghostContent,
      borderColor: t.colors.ghostBorder,
      iconColor: t.colors.ghostIcon,
      disabled: {
        color: t.colors.ghostDisabledContent,
        borderColor: t.colors.ghostDisabledBorder,
        backgroundColor: t.colors.ghostDisabledBackground,
        iconColor: t.colors.ghostDisabledIcon,
      },
      hovered: {
        backgroundColor: t.colors.ghostHoveredBackground,
        color: t.colors.ghostHoveredContent,
        borderColor: t.colors.ghostHoveredBorder,
        iconColor: t.colors.ghostHoveredIcon,
      },
      pressed: {
        backgroundColor: t.colors.ghostPressedBackground,
        borderColor: t.colors.ghostPressedBorder,
        color: t.colors.ghostPressedContent,
        icon: t.colors.ghostPressedIcon,
      },
      focused: {
        borderColor: t.colors.ghostFocusedBorder,
        backgroundColor: t.colors.ghostFocusedBackground,
        color: t.colors.ghostFocusedContent,
        icon: t.colors.ghostFocusedIcon,
      },
    },
  } as ButtonTokens);

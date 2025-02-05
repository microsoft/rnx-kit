import type { Theme } from '@fluentui-react-native/framework';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { FABTokens } from './FAB.types';

export const defaultFABColorTokens: TokenSettings<FABTokens, Theme> = (t: Theme): FABTokens => ({
  // Default coloring same as 'primary' or 'accent'
  backgroundColor: t.colors.brandBackground,
  color: t.colors.neutralForegroundOnColor,
  iconColor: t.colors.neutralForegroundOnColor,
  disabled: {
    backgroundColor: t.colors.neutralBackground5,
    color: t.colors.neutralForegroundDisabled,
    iconColor: t.colors.neutralForegroundDisabled,
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
    borderInnerColor: t.colors.strokeFocus1,
    iconColor: t.colors.neutralForegroundOnColor,
  },
  subtle: {
    backgroundColor: t.colors.neutralBackground1,
    color: t.colors.neutralForeground2,
    iconColor: t.colors.neutralForeground2,
    disabled: {
      backgroundColor: t.colors.neutralBackground5,
      color: t.colors.neutralForegroundDisabled,
      iconColor: t.colors.neutralForegroundDisabled,
    },
    pressed: {
      backgroundColor: t.colors.neutralBackground1Pressed,
      color: t.colors.neutralForeground2,
      iconColor: t.colors.neutralForeground2,
    },
    focused: {
      backgroundColor: t.colors.neutralBackground1,
      color: t.colors.neutralForeground2,
      borderColor: t.colors.strokeFocus2,
      borderInnerColor: t.colors.strokeFocus1,
      iconColor: t.colors.neutralForeground2,
    },
  },
});

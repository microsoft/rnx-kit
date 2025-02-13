import type { Theme } from '@fluentui-react-native/framework';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { FABTokens } from './FAB.types';

export const defaultFABColorTokens: TokenSettings<FABTokens, Theme> = (t: Theme): FABTokens => ({
  // Default coloring same as 'primary' or 'accent'
  backgroundColor: t.colors.brandBackground,
  color: t.colors.neutralForegroundOnColor,
  iconColor: t.colors.neutralForegroundOnColor,
  rippleColor: '#D4D4D4', //Android Only
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
    backgroundColor: t.colors.neutralBackground5,
    color: t.colors.brandForeground1,
    iconColor: t.colors.brandForeground1,
    rippleColor: '#D4D4D4',
    disabled: {
      backgroundColor: t.colors.neutralBackgroundDisabled,
      color: t.colors.neutralForegroundDisabled,
      iconColor: t.colors.neutralForegroundDisabled,
    },
    pressed: {
      backgroundColor: t.colors.neutralBackground1Pressed,
      color: t.colors.brandForeground1Pressed,
      iconColor: t.colors.brandForeground1Pressed,
    },
    focused: {
      backgroundColor: t.colors.neutralBackground5,
      color: t.colors.brandForeground1,
      borderColor: t.colors.strokeFocus2,
      borderInnerColor: t.colors.strokeFocus1,
      iconColor: t.colors.brandForeground1,
    },
  },
});

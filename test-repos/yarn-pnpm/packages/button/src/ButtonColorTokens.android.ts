import type { Theme } from '@fluentui-react-native/framework';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { ButtonTokens } from './Button.types';

export const defaultButtonColorTokens: TokenSettings<ButtonTokens, Theme> = (t: Theme) =>
  ({
    /** Android does not have a different styles for 'default' button.
     * 'primary', 'accent' and if no appearance is mentioned, picks this.
     */
    backgroundColor: t.colors.brandBackground,
    rippleColor: '#D4D4D4',
    color: t.colors.neutralForegroundOnColor,
    iconColor: t.colors.neutralForegroundOnColor,
    disabled: {
      backgroundColor: t.colors.neutralBackground5,
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
      borderInnerColor: t.colors.strokeFocus1,
      iconColor: t.colors.neutralForegroundOnColor,
    },
    subtle: {
      backgroundColor: 'transparent',
      rippleColor: '#D4D4D4',
      color: t.colors.brandForeground1,
      iconColor: t.colors.brandForeground1,
      disabled: {
        backgroundColor: 'transparent',
        color: t.colors.neutralForegroundDisabled1,
        iconColor: t.colors.neutralForegroundDisabled1,
      },
      pressed: {
        backgroundColor: 'transparent',
        color: t.colors.brandForeground1Pressed,
        iconColor: t.colors.brandForeground1Pressed,
      },
      focused: {
        backgroundColor: 'transparent',
        borderColor: t.colors.strokeFocus2,
        borderInnerColor: t.colors.strokeFocus1,
        color: t.colors.brandForeground1,
        iconColor: t.colors.brandForeground1,
      },
    },
    outline: {
      backgroundColor: 'transparent',
      rippleColor: '#D4D4D4',
      color: t.colors.brandForeground1,
      iconColor: t.colors.brandForeground1,
      borderColor: t.colors.brandStroke1,
      disabled: {
        backgroundColor: 'transparent',
        color: t.colors.neutralForegroundDisabled1,
        iconColor: t.colors.neutralForegroundDisabled1,
        borderColor: t.colors.neutralStrokeDisabled,
      },
      pressed: {
        backgroundColor: 'transparent',
        color: t.colors.brandForeground1Pressed,
        iconColor: t.colors.brandForeground1Pressed,
        borderColor: t.colors.brandStroke1Pressed,
      },
      focused: {
        backgroundColor: 'transparent',
        borderColor: t.colors.strokeFocus2,
        borderInnerColor: t.colors.strokeFocus1,
        color: t.colors.brandForeground1,
        iconColor: t.colors.brandForeground1,
      },
    },
  } as ButtonTokens);

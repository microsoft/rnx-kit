import type { IViewProps } from '@fluentui-react-native/adapters';
import type { IComposeSettings } from '@uifabricshared/foundation-compose';

import type { IButtonType } from './Button.types';
import { buttonName } from './Button.types';

/**
 * @deprecated This will be removed when the package moves to 1.0.0.
 * Please see MIGRATION.md for details on how to move to the new Button.
 */
export const settings: IComposeSettings<IButtonType> = [
  {
    tokens: {
      backgroundColor: 'buttonBackground',
      color: 'buttonText',
      borderColor: 'buttonBorder',
      borderWidth: 1,
      borderRadius: 12,
    },
    root: {
      accessible: false,
      focusable: false,
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        flexDirection: 'row',
        alignSelf: 'flex-start',
        overflow: 'hidden',
      },
    } as IViewProps,
    ripple: {
      accessible: true,
      focusable: true,
      accessibilityRole: 'button',
      android_ripple: {
        color: 'buttonBackgroundPressed',
      },
    },
    content: {
      variant: 'bodySemibold',
    },
    startIcon: {
      style: {
        marginEnd: 10,
      },
    },
    stack: {
      style: {
        display: 'flex',
        paddingVertical: 14,
        paddingHorizontal: 20,
        alignItems: 'center',
        flexDirection: 'row',
        alignSelf: 'flex-start',
        minHeight: 52,
        minWidth: 80,
        justifyContent: 'center',
      },
    },
    _precedence: ['hovered', 'focused', 'pressed', 'disabled'],
    _overrides: {
      disabled: {
        tokens: {
          backgroundColor: 'buttonBackgroundDisabled',
          color: 'buttonTextDisabled',
          borderColor: 'buttonBorderDisabled',
        },
      },
      hovered: {
        tokens: {
          backgroundColor: 'buttonBackgroundHovered',
          color: 'buttonTextHovered',
          borderColor: 'buttonBorderHovered',
        },
      },
      pressed: {
        tokens: {
          backgroundColor: 'buttonBackgroundPressed',
          color: 'buttonTextPressed',
          borderColor: 'buttonPressedBorder',
        },
      },
      focused: {
        tokens: {
          borderColor: 'buttonBorderFocused',
          color: 'buttonTextHovered',
          backgroundColor: 'buttonBackgroundHovered',
        },
      },
    },
  },
  buttonName,
];

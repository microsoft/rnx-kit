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
      borderRadius: 4,
      wrapperBorderColor: 'transparent',
    },
    root: {
      accessible: true,
      focusable: true,
      accessibilityRole: 'button',
      style: {
        display: 'flex',
        alignItems: 'flex-start',
        flexDirection: 'row',
        alignSelf: 'flex-start',
      },
    } as IViewProps,
    borderWrapper: {
      style: {
        display: 'flex',
        flexGrow: 1,
        borderWidth: 1,
      },
    },
    endIcon: {
      style: {
        marginStart: 2,
      },
    },
    startIcon: {
      style: {
        marginEnd: 2,
      },
    },
    content: {
      style: {
        marginStart: 2,
        marginEnd: 2,
      },
    },
    stack: {
      style: {
        display: 'flex',
        paddingStart: 6,
        paddingEnd: 6,
        alignItems: 'center',
        flexDirection: 'row',
        alignSelf: 'flex-start',
        minHeight: 24,
        minWidth: 32,
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
          wrapperBorderColor: 'buttonBorderFocused',
        },
      },
    },
  },
  buttonName,
];

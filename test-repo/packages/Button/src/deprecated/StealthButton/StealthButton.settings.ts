import type { IComposeSettings } from '@uifabricshared/foundation-compose';

import type { IButtonType } from '../Button.types';

export const settings: IComposeSettings<IButtonType> = [
  {
    tokens: {
      backgroundColor: 'menuBackground',
      color: 'menuItemText',
      borderColor: 'menuBackground',
    },
    _overrides: {
      disabled: {
        tokens: {
          color: 'disabledBodyText',
          borderColor: 'menuBackground',
          backgroundColor: 'background',
        },
      },
      hovered: {
        tokens: {
          backgroundColor: 'menuItemBackgroundHovered',
          color: 'menuItemTextHovered',
          borderColor: 'menuItemBackgroundHovered',
        },
      },
      pressed: {
        tokens: {
          backgroundColor: 'menuItemBackgroundPressed',
          borderColor: 'menuItemBackgroundPressed',
        },
      },
      focused: {
        tokens: {
          borderColor: 'focusBorder',
          backgroundColor: 'menuItemBackgroundHovered',
          color: 'menuItemTextHovered',
        },
      },
    },
  },
  'StealthButton',
];

import type { TextStyle } from 'react-native';

import type { IComposeSettings } from '@uifabricshared/foundation-compose';

import type { ITextType } from './Text.types';
import { textName } from './Text.types';

export const settings: IComposeSettings<ITextType> = [
  {
    tokens: {
      variant: 'secondaryStandard',
      color: 'bodyText',
    },
    root: {
      style: {
        margin: 0,
      } as TextStyle,
    },
    _overrides: {
      disabled: {
        tokens: {
          color: 'disabledText',
        },
      },
    },
    _precedence: ['disabled'],
  },
  textName,
];

import { PlatformColor } from 'react-native';

import type { Theme } from '@fluentui-react-native/framework';
import { isHighContrast } from '@fluentui-react-native/theming-utils';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { CompoundButtonTokens } from './CompoundButton.types';

export const defaultCompoundButtonColorTokens: TokenSettings<CompoundButtonTokens, Theme> = (t: Theme): CompoundButtonTokens => {
  if (isHighContrast(t)) {
    return highContrastColors;
  }

  return {
    secondaryContentColor: t.colors.neutralForeground2,
    disabled: {
      secondaryContentColor: t.colors.neutralForegroundDisabled,
    },
    hovered: {
      secondaryContentColor: t.colors.neutralForeground2Hover,
    },
    focused: {
      secondaryContentColor: t.colors.neutralForeground2Hover,
    },
    pressed: {
      secondaryContentColor: t.colors.neutralForeground2Pressed,
    },
    primary: {
      secondaryContentColor: t.colors.neutralForegroundOnBrand,
      hovered: {
        secondaryContentColor: t.colors.neutralForegroundOnBrandHover,
      },
      focused: {
        secondaryContentColor: t.colors.neutralForegroundOnBrandHover,
      },
      pressed: {
        secondaryContentColor: t.colors.neutralForegroundOnBrandPressed,
      },
    },
    subtle: {
      secondaryContentColor: t.colors.neutralForeground2,
      hovered: {
        secondaryContentColor: t.colors.neutralForeground2Hover,
      },
      focused: {
        secondaryContentColor: t.colors.neutralForeground2Hover,
      },
      pressed: {
        secondaryContentColor: t.colors.neutralForeground2Pressed,
      },
    },
  };
};

const highContrastColors = {
  secondaryContentColor: PlatformColor('ButtonText'),
  disabled: {
    secondaryContentColor: PlatformColor('GrayText'),
  },
  hovered: {
    secondaryContentColor: PlatformColor('HighlightText'),
  },
  focused: {
    secondaryContentColor: PlatformColor('HighlightText'),
  },
  pressed: {
    secondaryContentColor: PlatformColor('HighlightText'),
  },
};

import type { Theme } from '@fluentui-react-native/framework';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { ButtonTokens } from './Button.types';

export const defaultButtonFontTokens: TokenSettings<ButtonTokens, Theme> = (_t: Theme) =>
  ({
    medium: {
      hasContent: {
        variant: 'bodyStandard',
      },
    },
    small: {
      hasContent: {
        variant: 'secondaryStandard',
      },
    },
    large: {
      variant: 'subheaderSemibold',
    },
  } as ButtonTokens);

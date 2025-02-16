import type { Theme } from '@fluentui-react-native/framework';
import { globalTokens } from '@fluentui-react-native/theme-tokens';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { ButtonTokens } from './Button.types';

export const defaultButtonFontTokens: TokenSettings<ButtonTokens, Theme> = (t: Theme) =>
  ({
    medium: {
      hasContent: {
        fontFamily: t.typography.families.secondary,
        fontSize: globalTokens.font.size300,
        fontWeight: globalTokens.font.weight.semibold,
      },
    },
    small: {
      hasContent: {
        fontFamily: t.typography.families.primary,
        fontSize: globalTokens.font.size200,
        fontWeight: globalTokens.font.weight.regular,
      },
    },
    large: {
      hasContent: {
        fontFamily: t.typography.families.secondary,
        fontSize: globalTokens.font.size400,
        fontWeight: globalTokens.font.weight.semibold,
      },
    },
  } as ButtonTokens);

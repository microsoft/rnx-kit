import type { Theme } from '@fluentui-react-native/framework';
import { globalTokens } from '@fluentui-react-native/theme-tokens';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { ButtonTokens } from './Button.types';

export const defaultButtonTokens: TokenSettings<ButtonTokens, Theme> = () =>
  ({
    block: {
      width: '100%',
    },
    medium: {
      paddingHorizontal: globalTokens.size120,
      borderWidth: globalTokens.stroke.width10,
      borderRadius: globalTokens.corner.radius80,
      minHeight: 40,
      iconSize: 20,
      focused: {
        borderWidth: 0,
      },
      hasContent: {
        minWidth: 96,
        hasIconAfter: {
          spacingIconContentAfter: globalTokens.size80,
        },
        hasIconBefore: {
          spacingIconContentBefore: globalTokens.size80,
        },
      },
    },
    small: {
      paddingHorizontal: globalTokens.size60,
      borderWidth: globalTokens.stroke.width10,
      borderRadius: globalTokens.corner.radius80,
      minHeight: 28,
      iconSize: 16,
      focused: {
        borderWidth: 0,
      },
      hasContent: {
        minWidth: 64,
        minHeight: 28,
        hasIconAfter: {
          spacingIconContentAfter: globalTokens.size40,
        },
        hasIconBefore: {
          spacingIconContentBefore: globalTokens.size40,
        },
      },
    },
    large: {
      paddingHorizontal: globalTokens.size160,
      borderWidth: globalTokens.stroke.width10,
      iconSize: 20,
      borderRadius: globalTokens.corner.radius120,
      minHeight: 52,
      focused: {
        borderWidth: 0,
      },
      hasContent: {
        minWidth: 96,
        hasIconAfter: {
          spacingIconContentAfter: globalTokens.size80,
        },
        hasIconBefore: {
          spacingIconContentBefore: globalTokens.size80,
        },
      },
    },
    circular: {
      borderRadius: globalTokens.corner.radiusCircular,
    },
    square: {
      borderRadius: globalTokens.corner.radiusNone,
    },
  } as ButtonTokens);

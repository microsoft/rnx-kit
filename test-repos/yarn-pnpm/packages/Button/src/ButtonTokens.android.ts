import type { Theme } from '@fluentui-react-native/framework';
import { globalTokens } from '@fluentui-react-native/theme-tokens';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { ButtonTokens } from './Button.types';

export const defaultButtonTokens: TokenSettings<ButtonTokens, Theme> = () =>
  ({
    focused: {
      borderWidth: globalTokens.stroke.width20,
      borderInnerWidth: globalTokens.stroke.width10,
    },
    subtle: {
      focused: {
        borderWidth: globalTokens.stroke.width20,
        borderInnerWidth: globalTokens.stroke.width10,
      },
    },
    outline: {
      borderWidth: globalTokens.stroke.width10,
      disabled: {
        borderWidth: globalTokens.stroke.width10,
      },
      pressed: {
        borderWidth: globalTokens.stroke.width10,
      },
      focused: {
        borderWidth: globalTokens.stroke.width20,
        borderInnerWidth: globalTokens.stroke.width10,
      },
    },
    block: {
      width: '100%',
    },
    large: {
      paddingHorizontal: globalTokens.size200,
      borderRadius: globalTokens.corner.radius80,
      iconSize: 20,
      outline: {
        borderWidth: globalTokens.stroke.width10,
        iconSize: 20,
      },
      spacingIconContentBefore: globalTokens.size80,
      spacingIconContentAfter: globalTokens.size80,
      minHeight: 48,
      minWidth: 36,
    },
    medium: {
      paddingHorizontal: globalTokens.size120,
      borderRadius: globalTokens.corner.radius40,
      iconSize: 20,
      outline: {
        borderWidth: globalTokens.stroke.width10,
        iconSize: 20,
      },
      spacingIconContentBefore: globalTokens.size80,
      spacingIconContentAfter: globalTokens.size80,
      minHeight: 36,
      minWidth: 36,
    },
    small: {
      paddingHorizontal: globalTokens.size80,
      borderRadius: globalTokens.corner.radius40,
      iconSize: 16,
      outline: {
        borderWidth: globalTokens.stroke.width10,
        iconSize: 16,
      },
      spacingIconContentBefore: globalTokens.size40,
      spacingIconContentAfter: globalTokens.size40,
      minHeight: 28,
      minWidth: 28,
    },
    rounded: {
      borderRadius: globalTokens.corner.radius40,
    },
    circular: {
      borderRadius: globalTokens.corner.radiusCircular,
    },
    square: {
      borderRadius: globalTokens.corner.radiusNone,
    },
  } as ButtonTokens);

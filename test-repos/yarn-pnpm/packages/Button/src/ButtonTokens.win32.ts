import type { Theme } from '@fluentui-react-native/framework';
import { globalTokens } from '@fluentui-react-native/theme-tokens';
import { isHighContrast } from '@fluentui-react-native/theming-utils';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { ButtonTokens } from './Button.types';

export const defaultButtonTokens: TokenSettings<ButtonTokens, Theme> = (theme: Theme) =>
  ({
    borderWidth: globalTokens.stroke.width10,
    borderInnerWidth: globalTokens.stroke.width10,
    block: {
      width: '100%',
    },
    medium: {
      padding: globalTokens.size80 - globalTokens.stroke.width10,
      iconSize: 16,
      focused: {
        borderWidth: 0,
        padding: globalTokens.size80,
      },
      primary: !isHighContrast(theme) && {
        focused: {
          borderWidth: globalTokens.stroke.width20,
          padding: globalTokens.size80 - globalTokens.stroke.width20,
        },
        square: {
          focused: {
            borderWidth: globalTokens.stroke.width10,
            padding: globalTokens.size80 - globalTokens.stroke.width10,
          },
        },
      },
      hasContent: {
        minWidth: 96,
        padding: globalTokens.size60 - globalTokens.stroke.width10,
        paddingHorizontal: globalTokens.size120 - globalTokens.stroke.width10,
        hasIconAfter: {
          spacingIconContentAfter: globalTokens.size80,
        },
        hasIconBefore: {
          spacingIconContentBefore: globalTokens.size80,
        },
        focused: {
          padding: globalTokens.size60,
          paddingHorizontal: globalTokens.size120,
        },
        primary: !isHighContrast(theme) && {
          focused: {
            padding: globalTokens.size60 - globalTokens.stroke.width20,
            paddingHorizontal: globalTokens.size120 - globalTokens.stroke.width20,
          },
          square: {
            focused: {
              padding: globalTokens.size60 - globalTokens.stroke.width10,
              paddingHorizontal: globalTokens.size120 - globalTokens.stroke.width10,
            },
          },
        },
      },
    },
    small: {
      padding: globalTokens.size40 - globalTokens.stroke.width10,
      iconSize: 16,
      focused: {
        borderWidth: 0,
        padding: globalTokens.size40,
      },
      primary: !isHighContrast(theme) && {
        focused: {
          borderWidth: globalTokens.stroke.width20,
          padding: globalTokens.size40 - globalTokens.stroke.width20,
        },
        square: {
          focused: {
            borderWidth: globalTokens.stroke.width10,
            padding: globalTokens.size40 - globalTokens.stroke.width10,
          },
        },
      },
      hasContent: {
        minWidth: 64,
        minHeight: 24,
        paddingHorizontal: globalTokens.size80 - globalTokens.stroke.width10,
        hasIconAfter: {
          spacingIconContentAfter: globalTokens.size40,
        },
        hasIconBefore: {
          spacingIconContentBefore: globalTokens.size40,
        },
        focused: {
          paddingHorizontal: globalTokens.size80,
        },
        primary: !isHighContrast(theme) && {
          focused: {
            paddingHorizontal: globalTokens.size80 - globalTokens.stroke.width20,
          },
          square: {
            focused: {
              paddingHorizontal: globalTokens.size80 - globalTokens.stroke.width10,
            },
          },
        },
      },
    },
    large: {
      padding: globalTokens.size100 - globalTokens.stroke.width10,
      iconSize: 20,
      focused: {
        borderWidth: 0,
        padding: globalTokens.size100,
      },
      primary: !isHighContrast(theme) && {
        focused: {
          borderWidth: globalTokens.stroke.width20,
          padding: globalTokens.size100 - globalTokens.stroke.width20,
        },
        square: {
          focused: {
            borderWidth: globalTokens.stroke.width10,
            padding: globalTokens.size100 - globalTokens.stroke.width10,
          },
        },
      },
      hasContent: {
        minWidth: 96,
        minHeight: 40,
        padding: globalTokens.size80 - globalTokens.stroke.width10,
        paddingHorizontal: globalTokens.size160 - globalTokens.stroke.width10,
        hasIconAfter: {
          spacingIconContentAfter: globalTokens.size60,
        },
        hasIconBefore: {
          spacingIconContentBefore: globalTokens.size60,
        },
        focused: {
          padding: globalTokens.size80,
          paddingHorizontal: globalTokens.size160,
        },
        primary: !isHighContrast(theme) && {
          focused: {
            padding: globalTokens.size80 - globalTokens.stroke.width20,
            paddingHorizontal: globalTokens.size160 - globalTokens.stroke.width20,
          },
          square: {
            focused: {
              padding: globalTokens.size80 - globalTokens.stroke.width10,
              paddingHorizontal: globalTokens.size160 - globalTokens.stroke.width10,
            },
          },
        },
      },
    },
    rounded: {
      borderRadius: globalTokens.corner.radius40,
      borderInnerRadius: globalTokens.corner.radius40 - 1, // reduce the rounding so that the curvature matches
    },
    circular: {
      borderRadius: globalTokens.corner.radiusCircular,
      borderInnerRadius: globalTokens.corner.radiusCircular - 1, // reduce the rounding so that the curvature matches
    },
    square: {
      borderRadius: globalTokens.corner.radiusNone,
      borderInnerRadius: globalTokens.corner.radiusNone,
    },
  } as ButtonTokens);

import type { Theme } from '@fluentui-react-native/framework';
import { globalTokens } from '@fluentui-react-native/theme-tokens';
import { isHighContrast } from '@fluentui-react-native/theming-utils';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { CompoundButtonTokens } from './CompoundButton.types';

export const defaultCompoundButtonTokens: TokenSettings<CompoundButtonTokens, Theme> = (theme: Theme): CompoundButtonTokens => ({
  medium: {
    padding: globalTokens.size120 - globalTokens.stroke.width10,
    focused: {
      padding: globalTokens.size120,
    },
    primary: !isHighContrast(theme) && {
      focused: {
        borderWidth: globalTokens.stroke.width20,
        padding: globalTokens.size120 - globalTokens.stroke.width20,
      },
      square: {
        focused: {
          borderWidth: globalTokens.stroke.width10,
          padding: globalTokens.size120 - globalTokens.stroke.width10,
        },
      },
    },
    hasContent: {
      paddingHorizontal: globalTokens.size120 - globalTokens.stroke.width10,
      minWidth: 96,
      focused: {
        paddingHorizontal: globalTokens.size120,
      },
      primary: !isHighContrast(theme) && {
        focused: {
          paddingHorizontal: globalTokens.size120 - globalTokens.stroke.width20,
        },
        circular: {
          focused: {
            paddingHorizontal: globalTokens.size160 - globalTokens.stroke.width20,
          },
        },
        square: {
          focused: {
            paddingHorizontal: globalTokens.size120 - globalTokens.stroke.width10,
          },
        },
      },
      hasIconAfter: {
        spacingIconContentAfter: globalTokens.size120,
      },
      hasIconBefore: {
        spacingIconContentBefore: globalTokens.size120,
      },
      circular: {
        paddingHorizontal: globalTokens.size160 - globalTokens.stroke.width10,
        focused: {
          paddingHorizontal: globalTokens.size160,
        },
      },
    },
  },
  small: {
    padding: globalTokens.size80 - globalTokens.stroke.width10,
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
      paddingHorizontal: globalTokens.size80 - globalTokens.stroke.width10,
      minWidth: 64,
      focused: {
        paddingHorizontal: globalTokens.size80,
      },
      primary: !isHighContrast(theme) && {
        focused: {
          paddingHorizontal: globalTokens.size80 - globalTokens.stroke.width20,
        },
        circular: {
          focused: {
            paddingHorizontal: globalTokens.size120 - globalTokens.stroke.width20,
          },
        },
        square: {
          focused: {
            paddingHorizontal: globalTokens.size80 - globalTokens.stroke.width10,
          },
        },
      },
      hasIconAfter: {
        spacingIconContentAfter: globalTokens.size80,
      },
      hasIconBefore: {
        spacingIconContentBefore: globalTokens.size80,
      },
      circular: {
        paddingHorizontal: globalTokens.size120 - globalTokens.stroke.width10,
        focused: {
          paddingHorizontal: globalTokens.size120,
        },
      },
    },
  },
  large: {
    padding: globalTokens.size160 - globalTokens.stroke.width10,
    focused: {
      padding: globalTokens.size160,
    },
    primary: !isHighContrast(theme) && {
      focused: {
        borderWidth: globalTokens.stroke.width20,
        padding: globalTokens.size160 - globalTokens.stroke.width20,
      },
      square: {
        focused: {
          borderWidth: globalTokens.stroke.width10,
          padding: globalTokens.size160 - globalTokens.stroke.width10,
        },
      },
    },
    hasContent: {
      paddingHorizontal: globalTokens.size160 - globalTokens.stroke.width10,
      minWidth: 96,
      focused: {
        paddingHorizontal: globalTokens.size160,
      },
      primary: !isHighContrast(theme) && {
        focused: {
          paddingHorizontal: globalTokens.size160 - globalTokens.stroke.width20,
        },
        circular: {
          focused: {
            paddingHorizontal: globalTokens.size200 - globalTokens.stroke.width20,
          },
        },
        square: {
          focused: {
            paddingHorizontal: globalTokens.size160 - globalTokens.stroke.width10,
          },
        },
      },
      hasIconAfter: {
        spacingIconContentAfter: globalTokens.size160,
      },
      hasIconBefore: {
        spacingIconContentBefore: globalTokens.size160,
      },
      circular: {
        paddingHorizontal: globalTokens.size200 - globalTokens.stroke.width10,
        focused: {
          paddingHorizontal: globalTokens.size200,
        },
      },
    },
  },
});

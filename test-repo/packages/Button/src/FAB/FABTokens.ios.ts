import type { Theme } from '@fluentui-react-native/framework';
import { globalTokens } from '@fluentui-react-native/theme-tokens';
import type { TokenSettings } from '@fluentui-react-native/use-styling';

import type { FABTokens } from './FAB.types';

export const defaultFABTokens: TokenSettings<FABTokens, Theme> = (t: Theme) =>
  ({
    shadowToken: t.shadows.shadow8,
    disabled: {
      shadowToken: t.shadows.shadow2,
    },
    pressed: {
      shadowToken: t.shadows.shadow2,
    },
    focused: {
      shadowToken: t.shadows.shadow2,
      borderWidth: globalTokens.stroke.width20,
      borderInnerWidth: globalTokens.stroke.width10,
    },
    subtle: {
      shadowToken: t.shadows.shadow8,
      disabled: {
        shadowToken: t.shadows.shadow2,
      },
      pressed: {
        shadowToken: t.shadows.shadow2,
      },
      focused: {
        shadowToken: t.shadows.shadow2,
        borderWidth: globalTokens.stroke.width20,
        borderInnerWidth: globalTokens.stroke.width10,
      },
    },
    large: {
      borderRadius: globalTokens.corner.radiusCircular,
      iconSize: 24,
      minHeight: 56,
      minWidth: 56,
      paddingHorizontal: globalTokens.size160,
      paddingVertical: globalTokens.size160,
      spacingIconContentBefore: 0,
      hasContent: {
        borderRadius: globalTokens.corner.radiusCircular,
        iconSize: 24,
        fontSize: t.typography.variants.body1Strong.size,
        fontFamily: t.typography.variants.body1Strong.face,
        fontWeight: t.typography.variants.body1Strong.weight,
        minHeight: 56,
        minWidth: 56,
        paddingStart: globalTokens.size160,
        paddingEnd: globalTokens.size200,
        paddingVertical: globalTokens.size160,
        spacingIconContentBefore: globalTokens.size80,
      },
    },
    small: {
      borderRadius: globalTokens.corner.radiusCircular,
      iconSize: 20,
      minHeight: 44,
      minWidth: 44,
      paddingHorizontal: globalTokens.size120,
      paddingVertical: globalTokens.size120,
      spacingIconContentBefore: 0,
      hasContent: {
        borderRadius: globalTokens.corner.radiusCircular,
        iconSize: 20,
        fontSize: t.typography.variants.body2Strong.size,
        fontFamily: t.typography.variants.body2Strong.face,
        fontWeight: t.typography.variants.body2Strong.weight,
        minHeight: 48,
        minWidth: 48,
        paddingHorizontal: globalTokens.size120,
        paddingStart: globalTokens.size120,
        paddingEnd: globalTokens.size160,
        spacingIconContentBefore: globalTokens.size80,
      },
    },
  } as FABTokens);

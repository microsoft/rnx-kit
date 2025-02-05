import { Platform } from 'react-native';

import type { Theme, UseStylingOptions } from '@fluentui-react-native/framework';
import { buildProps } from '@fluentui-react-native/framework';
import { getTextMarginAdjustment } from '@fluentui-react-native/styling-utils';
import { borderStyles, layoutStyles, fontStyles, shadowStyles } from '@fluentui-react-native/tokens';

import { fabName } from './FAB.types';
import type { FABProps, FABSlotProps, FABTokens } from './FAB.types';
import { defaultFABColorTokens } from './FABColorTokens';
import { defaultFABTokens } from './FABTokens';

export const FABStates: (keyof FABTokens)[] = ['focused', 'pressed', 'subtle', 'disabled', 'large', 'small', 'hasContent'];

export const stylingSettings: UseStylingOptions<FABProps, FABSlotProps, FABTokens> = {
  tokens: [defaultFABTokens, defaultFABColorTokens, fabName],
  states: FABStates,
  slotProps: {
    ...(Platform.OS === 'android' && {
      rippleContainer: buildProps(
        (tokens: FABTokens) => {
          return {
            style: {
              flexDirection: 'row',
              alignSelf: 'baseline',
              borderColor: tokens.borderInnerColor,
              borderWidth: tokens.borderInnerWidth,
              borderRadius: tokens.borderRadius,
              overflow: 'hidden',
              elevation: tokens.elevation,
            },
          };
        },
        ['borderRadius'],
      ),
    }),
    root: buildProps(
      (tokens: FABTokens, theme: Theme) => ({
        style: {
          display: 'flex',
          alignItems: 'center',
          flexDirection: 'row',
          alignSelf: 'flex-start',
          justifyContent: 'center',
          width: tokens.width,
          backgroundColor: tokens.backgroundColor,
          ...borderStyles.from(tokens, theme),
          ...layoutStyles.from(tokens, theme),
          ...shadowStyles.from(tokens, theme),
        },
        android_ripple: {
          color: tokens.rippleColor,
        },
      }),
      ['backgroundColor', 'width', 'elevation', 'rippleColor', ...borderStyles.keys, ...layoutStyles.keys, ...shadowStyles.keys],
    ),
    content: buildProps(
      (tokens: FABTokens, theme: Theme) => ({
        style: {
          color: tokens.color,
          ...getTextMarginAdjustment(),
          ...(tokens.spacingIconContentBefore && { marginStart: tokens.spacingIconContentBefore }),
          ...fontStyles.from(tokens, theme),
        },
      }),
      ['color', 'spacingIconContentBefore', ...fontStyles.keys],
    ),
    icon: buildProps(
      (tokens: FABTokens) => ({
        color: tokens.iconColor,
        height: tokens.iconSize,
        width: tokens.iconSize,
      }),
      ['iconColor', 'iconSize'],
    ),
    shadow: buildProps(
      (tokens: FABTokens) => ({
        shadowToken: tokens.shadowToken,
      }),
      ['shadowToken'],
    ),
  },
};

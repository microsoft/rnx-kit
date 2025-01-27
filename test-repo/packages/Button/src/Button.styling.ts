import type { ColorValue } from 'react-native';
import { Platform } from 'react-native';

import type { Theme, UseStylingOptions } from '@fluentui-react-native/framework';
import { buildProps } from '@fluentui-react-native/framework';
import { getTextMarginAdjustment } from '@fluentui-react-native/styling-utils';
import { borderStyles, layoutStyles, fontStyles } from '@fluentui-react-native/tokens';
import type { FontTokens } from '@fluentui-react-native/tokens';

import { buttonName } from './Button.types';
import type { ButtonTokens, ButtonSlotProps, ButtonProps, ButtonSize, ButtonAppearance } from './Button.types';
import { defaultButtonColorTokens } from './ButtonColorTokens';
import { defaultButtonFontTokens } from './ButtonFontTokens';
import { defaultButtonTokens } from './ButtonTokens';

export const buttonStates: (keyof ButtonTokens)[] = [
  'block',
  'small',
  'medium',
  'large',
  'hasContent',
  'hasIconAfter',
  'hasIconBefore',
  'primary',
  'subtle',
  'outline',
  'rounded',
  'circular',
  'square',
  'hovered',
  'focused',
  'pressed',
  'disabled',
];

export const stylingSettings: UseStylingOptions<ButtonProps, ButtonSlotProps, ButtonTokens> = {
  tokens: [defaultButtonTokens, defaultButtonFontTokens, defaultButtonColorTokens, buttonName],
  states: buttonStates,
  slotProps: {
    ...(Platform.OS === 'android' && {
      rippleContainer: buildProps(
        (tokens: ButtonTokens) => {
          return {
            style: {
              flexDirection: 'row',
              alignSelf: 'baseline',
              borderColor: tokens.borderInnerColor,
              borderWidth: tokens.borderInnerWidth,
              borderRadius: tokens.borderRadius,
              overflow: 'hidden',
            },
          };
        },
        ['borderRadius'],
      ),
    }),
    root: buildProps(
      (tokens: ButtonTokens, theme: Theme) => ({
        style: {
          display: 'flex',
          overflow: 'hidden',
          alignItems: 'center',
          flexDirection: 'row',
          alignSelf: 'flex-start',
          justifyContent: 'center',
          width: tokens.width,
          backgroundColor: tokens.backgroundColor,
          ...borderStyles.from(tokens, theme),
          ...layoutStyles.from(tokens, theme),
        },
        android_ripple: {
          color: tokens.rippleColor,
        },
      }),
      ['backgroundColor', 'width', 'rippleColor', ...borderStyles.keys, ...layoutStyles.keys],
    ),
    content: buildProps(
      (tokens: ButtonTokens, theme: Theme) => {
        return {
          style: {
            ...contentStyling(tokens, theme, tokens.color, tokens),
          },
        };
      },
      ['color', 'spacingIconContentAfter', 'spacingIconContentBefore', ...fontStyles.keys],
    ),
    icon: buildProps(
      (tokens: ButtonTokens) => ({
        color: tokens.iconColor,
        height: tokens.iconSize,
        width: tokens.iconSize,
      }),
      ['iconColor', 'iconSize'],
    ),
    focusInnerBorder: buildProps(
      (tokens: ButtonTokens) => ({
        style: {
          position: 'absolute',
          borderWidth: tokens.borderInnerWidth,
          borderColor: tokens.borderInnerColor,
          borderRadius: tokens.borderInnerRadius,
        },
      }),
      ['borderInnerWidth', 'borderInnerColor', 'borderInnerRadius'],
    ),
  },
};

export const getDefaultSize = (): ButtonSize => {
  if (Platform.OS === 'windows') {
    return 'medium';
  } else if ((Platform.OS as any) === 'win32') {
    return 'small';
  } else if (Platform.OS === 'macos') {
    return 'small';
  }
  return 'medium';
};

export const getPlatformSpecificAppearance = (appearance: ButtonAppearance): ButtonAppearance => {
  // Mobile platforms do not have seperate styling when no appearance is passed.
  const hasDifferentDefaultAppearance = !(Platform.OS === 'android' || Platform.OS === 'ios');

  switch (appearance) {
    case 'accent': // Included to cover Mobile platform naming guidelines, maps to 'primary'.
      return 'primary';

    case 'primary':
    case 'subtle':
    case 'outline': // 'Outline' exists only for Mobile platforms, default picked on other platforms.
      return appearance;

    default:
      if (hasDifferentDefaultAppearance) {
        return null;
      } else {
        return 'primary';
      }
  }
};

export const contentStyling = (tokens: ButtonTokens, theme: Theme, contentColor: ColorValue, fontStylesTokens: FontTokens) => {
  const textAdjustment = getTextMarginAdjustment();
  const spacingIconContentBefore = tokens.spacingIconContentBefore
    ? {
        marginStart: textAdjustment.marginStart + tokens.spacingIconContentBefore,
      }
    : {};
  const spacingIconContentAfter = tokens.spacingIconContentAfter
    ? {
        marginEnd: textAdjustment.marginEnd + tokens.spacingIconContentAfter,
      }
    : {};
  return {
    color: contentColor,
    ...getTextMarginAdjustment(),
    ...spacingIconContentBefore,
    ...spacingIconContentAfter,
    ...fontStyles.from(fontStylesTokens, theme),
  };
};

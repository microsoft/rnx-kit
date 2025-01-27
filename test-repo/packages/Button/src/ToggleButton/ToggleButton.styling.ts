import type { Theme, UseStylingOptions } from '@fluentui-react-native/framework';
import { buildProps } from '@fluentui-react-native/framework';
import { borderStyles, layoutStyles, fontStyles } from '@fluentui-react-native/tokens';

import { toggleButtonName } from './ToggleButton.types';
import type { ToggleButtonTokens, ToggleButtonSlotProps, ToggleButtonProps } from './ToggleButton.types';
import { defaultToggleButtonColorTokens } from './ToggleButtonColorTokens';
import { buttonStates, contentStyling } from '../Button.styling';
import { defaultButtonColorTokens } from '../ButtonColorTokens';
import { defaultButtonFontTokens } from '../ButtonFontTokens';
import { defaultButtonTokens } from '../ButtonTokens';

export const stylingSettings: UseStylingOptions<ToggleButtonProps, ToggleButtonSlotProps, ToggleButtonTokens> = {
  tokens: [defaultButtonTokens, defaultButtonFontTokens, defaultButtonColorTokens, defaultToggleButtonColorTokens, toggleButtonName],
  states: ['checked', ...buttonStates],
  slotProps: {
    root: buildProps(
      (tokens: ToggleButtonTokens, theme: Theme) => ({
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
        },
      }),
      ['backgroundColor', 'width', ...borderStyles.keys, ...layoutStyles.keys],
    ),
    content: buildProps(
      (tokens: ToggleButtonTokens, theme: Theme) => ({
        style: {
          ...contentStyling(tokens, theme, tokens.color, tokens),
        },
      }),
      ['color', 'spacingIconContentAfter', 'spacingIconContentBefore', ...fontStyles.keys],
    ),
    icon: buildProps(
      (tokens: ToggleButtonTokens) => ({
        style: {
          tintColor: tokens.iconColor,
        },
        height: tokens.iconSize,
        width: tokens.iconSize,
      }),
      ['iconColor', 'iconSize'],
    ),
    focusInnerBorder: buildProps(
      (tokens: ToggleButtonTokens) => ({
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

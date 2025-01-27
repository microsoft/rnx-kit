import type { Theme, UseStylingOptions } from '@fluentui-react-native/framework';
import { buildProps } from '@fluentui-react-native/framework';
import { borderStyles, fontStyles, layoutStyles } from '@fluentui-react-native/tokens';

import { compoundButtonName } from './CompoundButton.types';
import type { CompoundButtonTokens, CompoundButtonSlotProps, CompoundButtonProps } from './CompoundButton.types';
import { defaultCompoundButtonColorTokens } from './CompoundButtonColorTokens';
import { defaultCompoundButtonFontTokens } from './CompoundButtonFontTokens';
import { defaultCompoundButtonTokens } from './CompoundButtonTokens';
import { buttonStates, contentStyling } from '../Button.styling';
import { defaultButtonColorTokens } from '../ButtonColorTokens';
import { defaultButtonTokens } from '../ButtonTokens';

export const stylingSettings: UseStylingOptions<CompoundButtonProps, CompoundButtonSlotProps, CompoundButtonTokens> = {
  tokens: [
    defaultButtonTokens,
    defaultButtonColorTokens,
    defaultCompoundButtonTokens,
    defaultCompoundButtonFontTokens,
    defaultCompoundButtonColorTokens,
    compoundButtonName,
  ],
  states: buttonStates,
  slotProps: {
    root: buildProps(
      (tokens: CompoundButtonTokens, theme: Theme) => ({
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
    contentContainer: {
      style: {
        display: 'flex',
        flexDirection: 'column',
      },
    },
    content: buildProps(
      (tokens: CompoundButtonTokens, theme: Theme) => {
        return {
          style: {
            ...contentStyling(tokens, theme, tokens.color, tokens),
          },
        };
      },
      ['color', 'spacingIconContentAfter', 'spacingIconContentBefore', ...fontStyles.keys],
    ),
    secondaryContent: buildProps(
      (tokens: CompoundButtonTokens, theme: Theme) => {
        return {
          style: {
            ...contentStyling(tokens, theme, tokens.secondaryContentColor, tokens.secondaryContentFont),
          },
        };
      },
      ['secondaryContentColor', 'secondaryContentFont', ...fontStyles.keys],
    ),
    icon: buildProps(
      (tokens: CompoundButtonTokens) => ({
        style: {
          tintColor: tokens.iconColor,
        },
        height: tokens.iconSize,
        width: tokens.iconSize,
      }),
      ['iconColor', 'iconSize'],
    ),
    focusInnerBorder: buildProps(
      (tokens: CompoundButtonTokens) => ({
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

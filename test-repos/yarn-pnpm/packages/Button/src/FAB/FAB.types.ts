import type { ShadowProps } from '@fluentui-react-native/experimental-shadow';
import type { IconSourcesType } from '@fluentui-react-native/icon';

import type { ButtonSlotProps, ButtonCoreTokens, ButtonCoreProps } from '../Button.types';

export const fabName = 'FAB';
export type FABSize = 'small' | 'large';
export type FABAppearance = 'primary' | 'subtle' | 'accent';

export interface FABSlotProps extends ButtonSlotProps {
  shadow?: ShadowProps;
}

export interface FABProps extends ButtonCoreProps {
  /**
   * A FAB can have its content and borders styled for greater emphasis or to be subtle.
   * - 'primary' or 'accent': Emphasizes the button as a primary action.
   *   'accent' is mobile naming convention, 'primary' included here to maintain parity with Button.
   * - 'subtle': Minimizes emphasis to blend into the background until hovered or focused.
   * @default 'primary' (or 'accent')
   */
  appearance?: FABAppearance;

  /*
   * Source URL or name of the icon to show on the Button.
   * 'icon' already exists in ButtonCoreProps. This overrides its optionality.
   */
  icon: IconSourcesType;

  /**
   * FAB text and other content can be hidden with this prop.
   * @default 'true'
   */
  showContent?: boolean;

  /** Sets style of FAB to a preset size style.
   * @default 'large'
   */
  size?: FABSize;
}

export interface FABTokens extends Omit<ButtonCoreTokens, 'spacingIconContentAfter'> {
  /**
   * States that can be applied to FAB.
   */
  focused?: FABTokens;
  pressed?: FABTokens;
  subtle?: FABTokens;
  disabled?: FABTokens;
  large?: FABTokens;
  small?: FABTokens;
  hasContent?: FABTokens;
}

export interface FABType {
  props: FABProps;
  tokens: FABTokens;
  slotProps: FABSlotProps;
}

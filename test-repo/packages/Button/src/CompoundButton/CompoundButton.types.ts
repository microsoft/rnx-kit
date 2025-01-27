import type { ColorValue, ViewProps } from "react-native";

import type { FontTokens } from "@fluentui-react-native/tokens";
import type { TextProps } from "rnx-test-repo-text";

import type {
  ButtonProps,
  ButtonSlotProps,
  ButtonTokens,
} from "../Button.types";

export const compoundButtonName = "CompoundButton";

export interface CompoundButtonTokens extends ButtonTokens {
  /**
   * Font of the second line of text on the button.
   */
  secondaryContentFont?: FontTokens;

  /**
   * Color of the second line of text on the button.
   */
  secondaryContentColor?: ColorValue;

  /**
   * States that can be applied to a button
   * These can be used to modify styles of the button when under the specified state.
   */
  hovered?: CompoundButtonTokens;
  focused?: CompoundButtonTokens;
  pressed?: CompoundButtonTokens;
  disabled?: CompoundButtonTokens;
  primary?: CompoundButtonTokens;
  subtle?: CompoundButtonTokens;
  small?: CompoundButtonTokens;
  medium?: CompoundButtonTokens;
  large?: CompoundButtonTokens;
  hasContent?: CompoundButtonTokens;
}

export interface CompoundButtonProps extends ButtonProps {
  /**
   * Second line of text that describes the action this button takes.
   */
  secondaryContent?: string;
}

export interface CompoundButtonSlotProps extends ButtonSlotProps {
  contentContainer: ViewProps;
  secondaryContent: TextProps;
}

export interface CompoundButtonType {
  props: CompoundButtonProps;
  tokens: CompoundButtonTokens;
  slotProps: CompoundButtonSlotProps;
}

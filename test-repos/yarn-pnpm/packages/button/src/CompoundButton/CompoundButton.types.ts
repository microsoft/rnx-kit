import type { ColorValue, ViewProps } from "react-native";

import type { FontTokens } from "@fluentui-react-native/tokens";
import type { TextProps } from "@rnx-repo-yarn-pnpm/text";

import type {
  ButtonProps,
  ButtonSlotProps,
  ButtonTokens,
} from "../Button.types";

export const compoundButtonName = "CompoundButton";

export type CompoundButtonTokens = ButtonTokens & {
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

export type CompoundButtonProps = ButtonProps & {
  /**
   * Second line of text that describes the action this button takes.
   */
  secondaryContent?: string;
}

export type CompoundButtonSlotProps = ButtonSlotProps & {
  contentContainer: ViewProps;
  secondaryContent: TextProps;
}

export type CompoundButtonType = {
  props: CompoundButtonProps;
  tokens: CompoundButtonTokens;
  slotProps: CompoundButtonSlotProps;
}

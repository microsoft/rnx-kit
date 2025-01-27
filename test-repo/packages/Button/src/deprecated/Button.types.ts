import type * as React from "react";
import type { ColorValue, PressableProps, ViewProps } from "react-native";

import type { IViewProps } from "@fluentui-react-native/adapters";
import type { IconProps, IconSourcesType } from "@fluentui-react-native/icon";
import type {
  IFocusable,
  IPressableState,
} from "@fluentui-react-native/interactive-hooks";
import type { IPressableProps } from "@fluentui-react-native/pressable";
import type {
  FontTokens,
  IBackgroundColorTokens,
  IBorderTokens,
  IForegroundColorTokens,
} from "@fluentui-react-native/tokens";
import type { IRenderData } from "@uifabricshared/foundation-composable";
import type { ITextProps } from "rnx-test-repo-text";

/**
 * @deprecated This will be removed when the package moves to 1.0.0.
 * Please see MIGRATION.md for details on how to move to the new Button.
 */
export const buttonName = "Button";

/**
 * @deprecated This will be removed when the package moves to 1.0.0.
 * Please see MIGRATION.md for details on how to move to the new Button.
 */
export interface IButtonInfo extends IPressableState {
  /**
   * Disables the button.
   * @default false
   * @deprecated
   */
  disabled?: boolean;

  /**
   * Button start icon.
   */
  startIcon?: boolean;

  /**
   * Button text.
   */
  content?: boolean;
  /**
   * End icon.
   */
  endIcon?: boolean;
}

/*
 * Because state updates are coming from the touchable and will cause a child render the button doesn't use
 * changes in state value to trigger re-render.  The values inside inner are effectively mutable and are used
 * for per-component storage
 *
 * @deprecated This will be removed when the package moves to 1.0.0.
 * Please see MIGRATION.md for details on how to move to the new Button.
 */
export interface IButtonState {
  info: IButtonInfo;
}

/**
 * @deprecated This will be removed when the package moves to 1.0.0.
 * Please see MIGRATION.md for details on how to move to the new Button.
 */
export interface IButtonTokens
  extends FontTokens,
    IForegroundColorTokens,
    IBackgroundColorTokens,
    IBorderTokens {
  /**
   * The amount of padding between the border and the contents.
   */
  contentPadding?: number | string;

  /**
   * The amount of padding between the border and the contents when the Button has focus.
   */
  contentPaddingFocused?: number | string;

  /**
   * The icon color.
   */
  iconColor?: ColorValue;

  /**
   * The icon color when hovering over the Button.
   */
  iconColorHovered?: ColorValue;

  /**
   * The icon color when the Button is being pressed.
   */
  iconColorPressed?: ColorValue;

  /**
   * The size of the icon.
   */
  iconSize?: number | string;

  /**
   * The weight of the lines used when drawing the icon.
   */
  iconWeight?: number;

  /**
   * Text to show on the Button.
   */
  content?: string;

  /**
   * Source URL or name of the icon to show on the Button.
   */
  startIcon?: IconSourcesType;
  endIcon?: IconSourcesType;
  wrapperBorderColor?: ColorValue;
}

/**
 * @deprecated This will be removed when the package moves to 1.0.0.
 * Please see MIGRATION.md for details on how to move to the new Button.
 */
export interface IButtonProps extends Omit<IPressableProps, "onPress"> {
  /**
   * Text to show on the Button.
   */
  content?: string;

  /**
   * Source URL or name of the start icon to show on the Button.
   * @deprecated Use startIcon instead.
   */
  icon?: IconSourcesType;
  /**
   * A RefObject to access the IButton interface. Use this to access the public methods and properties of the component.
   */
  componentRef?: React.RefObject<IFocusable>;
  /**
   * A callback to call on button click event
   */
  onClick?: () => void;

  testID?: string;
  tooltip?: string;
  startIcon?: IconSourcesType;
  endIcon?: IconSourcesType;
}

/**
 * @deprecated This will be removed when the package moves to 1.0.0.
 * Please see MIGRATION.md for details on how to move to the new Button.
 */
export interface IButtonSlotProps {
  root: React.PropsWithRef<IViewProps>;
  ripple?: PressableProps; // This slot exists to enable ripple-effect in android. It does not affect other platforms.
  stack: ViewProps;
  borderWrapper: ViewProps;
  startIcon: IconProps;
  content: ITextProps;
  endIcon: IconProps;
}

/**
 * @deprecated This will be removed when the package moves to 1.0.0.
 * Please see MIGRATION.md for details on how to move to the new Button.
 */
export type IButtonRenderData = IRenderData<IButtonSlotProps, IButtonState>;

/**
 * @deprecated This will be removed when the package moves to 1.0.0.
 * Please see MIGRATION.md for details on how to move to the new Button.
 */
export interface IButtonType {
  props: IButtonProps;
  tokens: IButtonTokens;
  slotProps: IButtonSlotProps;
  state: IButtonState;
}

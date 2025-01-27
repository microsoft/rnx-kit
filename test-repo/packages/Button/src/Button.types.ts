import type * as React from "react";
import type { ColorValue, ViewStyle } from "react-native";

import type { IViewProps } from "@fluentui-react-native/adapters";
import type { IconProps, IconSourcesType } from "@fluentui-react-native/icon";
import type {
  IFocusable,
  InteractionEvent,
  PressablePropsExtended,
  PressableState,
} from "@fluentui-react-native/interactive-hooks";
import type { ShadowToken } from "@fluentui-react-native/theme-types";
import type {
  FontTokens,
  IBorderTokens,
  IColorTokens,
  IShadowTokens,
  LayoutTokens,
} from "@fluentui-react-native/tokens";
import type { TextProps } from "rnx-test-repo-text";

export const buttonName = "Button";
export type ButtonSize = "small" | "medium" | "large";
export type ButtonAppearance = "primary" | "subtle" | "accent" | "outline";
export type ButtonShape = "rounded" | "circular" | "square";

// Core Props/Tokens are shared between FAB and Buttons
export interface ButtonCoreTokens
  extends LayoutTokens,
    FontTokens,
    IBorderTokens,
    IShadowTokens,
    IColorTokens {
  /**
   * The icon color.
   */
  iconColor?: ColorValue;

  /**
   * Ripple color for Android.
   *
   * A ripple animation is shown on click for Android. This sets the color of the ripple.
   * @platform android
   */
  rippleColor?: ColorValue;

  /**
   * The size of the icon.
   */
  iconSize?: number;

  /**
   * The weight of the lines used when drawing the icon.
   */
  iconWeight?: number;

  /**
   * The width of the button.
   */
  width?: ViewStyle["width"];

  /**
   * The amount of spacing between an icon and the content when iconPosition is set to 'before', in pixels.
   */
  spacingIconContentBefore?: number;

  /**
   * The amount of spacing between an icon and the content when iconPosition is set to 'after', in pixels.
   */
  spacingIconContentAfter?: number;

  /**
   * An object describing the shadow of the button.
   */
  shadowToken?: ShadowToken;

  /**
   * Focused State on Android and win32 primary has inner and outer borders.
   * Outer Border is equivalent to the border tokens from IBorders.
   */
  borderInnerColor?: ColorValue;
  borderInnerWidth?: number;
  borderInnerRadius?: number;
  borderInnerStyle?: ViewStyle["borderStyle"];
}

export interface ButtonTokens extends ButtonCoreTokens {
  /**
   * States that can be applied to a button.
   */
  hovered?: ButtonTokens;
  focused?: ButtonTokens;
  pressed?: ButtonTokens;
  disabled?: ButtonTokens;
  hasContent?: ButtonTokens;
  hasIconBefore?: ButtonTokens;
  primary?: ButtonTokens;
  subtle?: ButtonTokens;
  outline?: ButtonTokens;
  block?: ButtonTokens;
  small?: ButtonTokens;
  medium?: ButtonTokens;
  large?: ButtonTokens;
  rounded?: ButtonTokens;
  circular?: ButtonTokens;
  square?: ButtonTokens;
  hasIconAfter?: ButtonTokens;
}

export interface ButtonCoreProps
  extends Omit<PressablePropsExtended, "onPress"> {
  /*
   * Source URL or name of the icon to show on the Button.
   */
  icon?: IconSourcesType;

  /**
   * Button contains only icon, there's no content.
   * Must be set for button to style correctly when button has no content.
   */
  iconOnly?: boolean;

  /**
   * A RefObject to access the IButton interface. Use this to access the public methods and properties of the component.
   */
  componentRef?: React.RefObject<IFocusable>;

  /**
   * A callback to call on button click event.
   */
  onClick?: (e: InteractionEvent) => void;

  /**
   * Text that should show in a tooltip when the user hovers over a button.
   */
  tooltip?: string;
}

export interface ButtonProps extends ButtonCoreProps {
  /**
   * A button can have its content and borders styled for greater emphasis or to be subtle.
   * - 'primary' or 'accent': Emphasizes the button as a primary action. 'Accent' added to support Mobile platform naming convention, maps to 'primary'.
   * - 'subtle': Minimizes emphasis to blend into the background until hovered or focused.
   * - 'outline': Similar to subtle but has a border. Implemented for mobile endpoints only. Maps to default on other platforms.
   * @default 'primary' on mobile endpoints, other platform have a separate style when no appearance is passed.
   */
  appearance?: ButtonAppearance;

  /**
   * A button can fill the width of its container.
   * @default false
   */
  block?: boolean;

  /**
   * Whether to use native focus visuals for the component.
   * @default true
   */
  enableFocusRing?: boolean;

  /** Sets style of button to a preset size style.
   * @default 'small' on win32, 'medium' elsewhere
   */
  size?: ButtonSize;

  /**
   * Button shape: 'rounded' | 'circular' | 'square'
   * @default 'rounded'
   */
  shape?: ButtonShape;

  /**
   * Icon can be placed before or after Button's content.
   * @default 'before'
   */
  iconPosition?: "before" | "after";

  /**
   * A button can show a loading indicator if it is waiting for another action to happen before allowing itself to
   * be interacted with.
   * @default false
   */
  loading?: boolean;
}

interface ButtonState extends PressableState {
  measuredHeight?: number;
  measuredWidth?: number;

  // win32 only. Whether the component should use a tone-tone focus border instead of single-tone
  shouldUseTwoToneFocusBorder?: boolean;
}

export interface ButtonInfo {
  props: ButtonProps & React.ComponentPropsWithRef<any>;
  state: ButtonState;
}

export interface ButtonSlotProps {
  root: React.PropsWithRef<PressablePropsExtended>;
  rippleContainer?: IViewProps; // Android only
  focusInnerBorder?: IViewProps; // Win32 only
  icon: IconProps;
  content: TextProps;
}

export interface ButtonType {
  props: ButtonProps;
  tokens: ButtonTokens;
  slotProps: ButtonSlotProps;
}

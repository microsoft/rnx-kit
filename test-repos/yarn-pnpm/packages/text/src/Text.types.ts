import type { ColorValue, Text, TextStyle } from 'react-native';

import type { ITextProps } from '@fluentui-react-native/adapters';
import type { FontTokens, FontVariantTokens, IForegroundColorTokens } from '@fluentui-react-native/framework';

export const textName = 'Text';

/**
 * Text tokens, these are the internally configurable values for Text elements. In particular these
 * drive decisions on how to build the styles
 */
export type TextTokens = Omit<FontTokens, 'fontFamily'> &
  IForegroundColorTokens &
  Omit<TextStyle, 'fontSize' | 'fontWeight' | 'color'> & {
    /**
     * (iOS only) The Dynamic Type ramp that a Text element should follow as the user changes their
     * preferred content size.
     */
    dynamicTypeRamp?: TextProps['dynamicTypeRamp'];

    /**
     * (iOS only) The maximum font size that a Text element will grow to as the user changes their
     * preferred content size.
     */
    maximumFontSize?: number;
  };

export type TextAlign = 'start' | 'center' | 'end' | 'justify';
export type TextFont = 'base' | 'monospace' | 'numeric';
export type TextSize = 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 1000;
export type TextWeight = 'regular' | 'medium' | 'semibold' | 'bold';

/**
 * Text props, based off of the standard react-native TextProps with some new extensions
 */
export type TextProps<TBase = ITextProps> = TBase &
  FontVariantTokens & {
    /**
     * foreground text color
     */
    color?: ColorValue;

    /**
     * Aligns text based on the parent container.
     *
     * @defaultValue start
     */
    align?: TextAlign;

    /**
     * Applies a block display for the content.
     *
     * @defaultValue false
     */
    block?: boolean;

    /**
     * A RefObject to the Text object. Use this to access the public methods and properties of the component.
     */
    componentRef?: React.RefObject<Text>;

    /**
     * Applies the font family to the content.
     *
     * @defaultValue base
     */
    font?: TextFont;

    /**
     * Applies the italic font style to the content.
     *
     * @defaultValue false
     */
    italic?: boolean;

    /**
     * Applies the strikethrough text decoration to the content.
     *
     * @defaultValue false
     */
    strikethrough?: boolean;

    /**
     * Applies font size and line height based on the theme tokens.
     *
     * @defaultValue 300
     */
    size?: TextSize;

    /**
     * Truncate overflowing text for block displays.
     *
     * @defaultValue false
     */
    truncate?: boolean;

    /**
     * Applies the underline text decoration to the content.
     *
     * @defaultValue false
     */
    underline?: boolean;

    /**
     * Applies font weight to the content.
     *
     * @defaultValue regular
     */
    weight?: TextWeight;

    /**
     * Wraps the text content on white spaces.
     *
     * @defaultValue true
     */
    wrap?: boolean;
  };

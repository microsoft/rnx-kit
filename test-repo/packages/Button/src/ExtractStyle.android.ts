import type { ViewStyle } from 'react-native';

import { memoize } from '@fluentui-react-native/framework';

/**
 * React Native's Pressable does not support curved edges.
 * It needs to be wrapped inside another view and have border set there.
 * This function extracts styles that should be applied on the outer view.
 *
 * @param style Styling that is to be applied on the component
 * @returns Array containing split styles that are to be applied on the inner and outer views
 */

export const extractOuterStylePropsAndroid = memoize((style: ViewStyle = {}): [outerStyleProps: ViewStyle, innerStyleProps: ViewStyle] => {
  const {
    margin,
    marginTop,
    marginBottom,
    marginLeft,
    marginRight,
    marginStart,
    marginEnd,
    marginVertical,
    marginHorizontal,
    start,
    end,
    left,
    right,
    top,
    bottom,
    display,
    opacity,
    ...restOfProps
  } = style;

  return [
    {
      margin,
      marginTop,
      marginBottom,
      marginLeft,
      marginRight,
      marginStart,
      marginEnd,
      marginVertical,
      marginHorizontal,
      start,
      end,
      left,
      right,
      top,
      bottom,
      display,
      opacity,
    },
    { ...restOfProps },
  ];
});

import * as React from 'react';
import type { AccessibilityState } from 'react-native';

import { memoize } from '@fluentui-react-native/framework';
import { useAsToggleWithEvent } from '@fluentui-react-native/interactive-hooks';

import type { ToggleButtonProps, ToggleButtonInfo } from './ToggleButton.types';
import { useButton } from '../useButton';

const defaultAccessibilityActions = [{ name: 'Toggle' }];

export const useToggleButton = (props: ToggleButtonProps): ToggleButtonInfo => {
  const { accessibilityActions, accessibilityState, defaultChecked, checked, onAccessibilityAction, onClick, ...rest } = props;
  // Warns defaultChecked and checked being mutually exclusive.
  if (defaultChecked != undefined && checked != undefined) {
    console.warn('defaultChecked and checked are mutually exclusive to one another. Use one or the other.');
  }
  const [checkedValue, toggle] = useAsToggleWithEvent(defaultChecked, checked, onClick);
  const accessibilityActionsProp = accessibilityActions
    ? [...defaultAccessibilityActions, ...accessibilityActions]
    : defaultAccessibilityActions;
  const onAccessibilityActionProp = React.useCallback(
    (event) => {
      switch (event.nativeEvent.actionName) {
        case 'Toggle':
          toggle(event);
          break;
      }
      onAccessibilityAction && onAccessibilityAction(event);
    },
    [toggle, onAccessibilityAction],
  );

  const button = useButton({
    onClick: toggle,
    accessibilityActions: accessibilityActionsProp,
    accessibilityState: getAccessibilityState(checkedValue, accessibilityState),
    onAccessibilityAction: onAccessibilityActionProp,
    ...rest,
  });

  return {
    props: button.props,
    state: { ...button.state, checked: checkedValue },
  };
};

const getAccessibilityState = memoize(getAccessibilityStateWorker);
function getAccessibilityStateWorker(toggled: boolean, accessibilityState?: AccessibilityState) {
  if (accessibilityState) {
    return { checked: toggled, ...accessibilityState };
  }
  return { checked: toggled };
}

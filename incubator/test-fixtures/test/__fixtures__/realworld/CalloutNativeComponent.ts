import codegenNativeCommands from 'react-native/Libraries/Utilities/codegenNativeCommands';
import codegenNativeComponent from 'react-native/Libraries/Utilities/codegenNativeComponent';

import type { HostComponent, ViewProps } from 'react-native';
import type { WithDefault, UnsafeMixed, Int32, DirectEventHandler, Double } from 'react-native/Libraries/Types/CodegenTypes';

interface AnchorRect {
  screenX: Double;
  screenY: Double;
  width: Double;
  height: Double;
}

/**
 * Shared native props specific to Callout native component
 */
export interface NativeProps extends ViewProps {
  accessibilityLabel?: string;
  accessibilityOnShowAnnouncement?: string;
  anchorRect?: AnchorRect;

  dismissBehaviors?: string[];
  doNotTakePointerCapture?: boolean;
  focusable?: boolean;
  isBeakVisible?: boolean;
  maxHeight?: Int32;
  maxWidth?: Int32;
  setInitialFocus?: boolean;

  // targetAnchor?: string; // Win32 only Callout can target an anchor registered in the anchor registry // Can be a node id or an anchor ID - This need to be reworked as Mixed types are not supported going forward
  testID?: string;

  onRestoreFocus?: DirectEventHandler<{ target: Int32; containsFocus: boolean }>;
  onDismiss?: DirectEventHandler<{ target: Int32 }>;
  onShow?: DirectEventHandler<{ target: Int32 }>;

  directionalHint?: WithDefault<
    | 'leftTopEdge'
    | 'leftCenter'
    | 'leftBottomEdge'
    | 'topLeftEdge'
    | 'topAutoEdge'
    | 'topCenter'
    | 'topRightEdge'
    | 'rightTopEdge'
    | 'rightCenter'
    | 'rightBottomEdge'
    | 'bottomLeftEdge'
    | 'bottonLeftEdge' // Typo in the original code, should be 'bottomLeftEdge'
    | 'bottomAutoEdge'
    | 'bottomCenter'
    | 'bottomRightEdge',
    'bottonLeftEdge'
  >;
  target?: UnsafeMixed;
}

export type CalloutComponentType = HostComponent<NativeProps>;

export interface CalloutNativeCommands {
  focusWindow: (viewRef: React.ElementRef<CalloutComponentType>) => void;
  blurWindow: (viewRef: React.ElementRef<CalloutComponentType>) => void;
}

export const Commands: CalloutNativeCommands = codegenNativeCommands<CalloutNativeCommands>({
  supportedCommands: ['blurWindow', 'focusWindow'],
});

export default codegenNativeComponent<NativeProps>('RCTCallout') as CalloutComponentType;

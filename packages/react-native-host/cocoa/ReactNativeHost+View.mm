#import "ReactNativeHost+Private.h"

#ifdef USE_FABRIC
#if __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)
#import <React/RCTFabricSurfaceHostingProxyRootView.h>
#else
#import <React/RCTFabricSurface.h>
#import <React/RCTSurfaceHostingProxyRootView.h>
#endif  // __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)
#ifdef USE_BRIDGELESS
#import <ReactCommon/RCTHost.h>
#endif  // USE_BRIDGELESS
static NSString *const kReactConcurrentRoot = @"concurrentRoot";
#else  // USE_FABRIC
#import <React/RCTRootView.h>
#endif  // USE_FABRIC

#if defined(RCT_DEV_MENU) && RCT_DEV_MENU && __has_include(<React/RCTDevMenu.h>)
#import <React/RCTDevMenu.h>
#define RNX_WIRE_DEV_MENU 1
#endif

@implementation ReactNativeHost (View)

+ (instancetype)hostFromRootView:(RNXView *)rootView
{
    if (![rootView respondsToSelector:@selector(bridge)]) {
        return nil;
    }

    id bridge = [rootView performSelector:@selector(bridge)];
    if (![bridge respondsToSelector:@selector(delegate)]) {
        return nil;
    }

    id delegate = [bridge performSelector:@selector(delegate)];
    if (![delegate isKindOfClass:self]) {
        return nil;
    }

    return delegate;
}

- (RNXView *)viewWithModuleName:(NSString *)moduleName
              initialProperties:(NSDictionary *)initialProperties;
{
#ifdef USE_FABRIC
    // Having `concurrentRoot` disabled when Fabric is enabled is not recommended:
    // https://github.com/facebook/react-native/commit/7eaabfb174b14a30c30c7017195e8110348e5f44
    // As of 0.74, it won't be possible to opt-out:
    // https://github.com/facebook/react-native/commit/30d186c3683228d4fb7a42f804eb2fdfa7c8ac03
    NSMutableDictionary *initialProps =
        initialProperties == nil
            ? [NSMutableDictionary dictionaryWithObjectsAndKeys:@YES, kReactConcurrentRoot, nil]
            : [initialProperties mutableCopy];
    if (initialProps[kReactConcurrentRoot] == nil) {
        initialProps[kReactConcurrentRoot] = @YES;
    }

    RNXView *rootView;
#if __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)
    rootView = [[RCTFabricSurfaceHostingProxyRootView alloc] initWithBridge:self.bridge
                                                                 moduleName:moduleName
                                                          initialProperties:initialProps];
#elif USE_BRIDGELESS
    RCTFabricSurface *surface = [self.reactHost createSurfaceWithModuleName:moduleName
                                                          initialProperties:initialProps];
#if __has_include(<react/renderer/graphics/LinearGradient.h>)  // >=0.77
    rootView = [[RCTSurfaceHostingProxyRootView alloc] initWithSurface:surface];
#else
    // `-initWithSurface:` implicitly calls `start` and causes race conditions.
    // This was fixed in 0.76.7, but for backwards compatibility, we should call
    // `-initWithSurface:sizeMeasureMode` when possible. For more details, see
    // https://github.com/facebook/react-native/pull/47313.
    RCTSurfaceSizeMeasureMode sizeMeasureMode =
        RCTSurfaceSizeMeasureModeWidthExact | RCTSurfaceSizeMeasureModeHeightExact;
    rootView = [[RCTSurfaceHostingProxyRootView alloc] initWithSurface:surface
                                                       sizeMeasureMode:sizeMeasureMode];
#endif  // __has_include(<react/renderer/graphics/LinearGradient.h>)
#else   // __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)
    RCTFabricSurface *surface =
        [[RCTFabricSurface alloc] initWithSurfacePresenter:self.surfacePresenter
                                                moduleName:moduleName
                                         initialProperties:initialProps];
    rootView = [[RCTSurfaceHostingProxyRootView alloc] initWithSurface:surface];
#endif  // __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)

#if defined(RNX_WIRE_DEV_MENU) && TARGET_OS_OSX
    // react-native-macos 0.81+ exposes a `devMenu` property on
    // `RCTSurfaceHostingView` whose `menuForEvent:` returns the dev menu on
    // secondary click. Wire it up here so it actually fires; upstream's
    // `RCTRootViewFactory` does the same, but consumers of this host bypass it.
    if ([rootView respondsToSelector:@selector(setDevMenu:)]) {
        [self usingModule:[RCTDevMenu class]
                    block:^(id<RCTBridgeModule> _Nullable module) {
                      if (module == nil) {
                          return;
                      }
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Warc-performSelector-leaks"
                      [rootView performSelector:@selector(setDevMenu:) withObject:module];
#pragma clang diagnostic pop
                    }];
    } else {
        // Older react-native-macos versions don't override `menuForEvent:` on
        // the Fabric root view, so secondary-click does nothing. Install a
        // gesture recognizer that pops up the dev menu directly.
        NSClickGestureRecognizer *recognizer = [[NSClickGestureRecognizer alloc]
            initWithTarget:self
                    action:@selector(rnx_showFallbackDevMenu:)];
        recognizer.buttonMask = 1 << 1;  // Secondary (right) button
        recognizer.numberOfClicksRequired = 1;
        [rootView addGestureRecognizer:recognizer];
    }
#endif  // RNX_WIRE_DEV_MENU && TARGET_OS_OSX

    return rootView;
#else
    return [[RCTRootView alloc] initWithBridge:self.bridge
                                    moduleName:moduleName
                             initialProperties:initialProperties];
#endif  // USE_FABRIC
}

#if defined(RNX_WIRE_DEV_MENU) && TARGET_OS_OSX

- (void)rnx_showFallbackDevMenu:(NSGestureRecognizer *)recognizer
{
    NSView *view = recognizer.view;
    if (view == nil) {
        return;
    }
    [self usingModule:[RCTDevMenu class]
                block:^(id<RCTBridgeModule> _Nullable module) {
                  if (module == nil || ![module respondsToSelector:@selector(menu)]) {
                      return;
                  }
                  NSMenu *menu = [(RCTDevMenu *)module menu];
                  if (menu == nil) {
                      return;
                  }
                  NSEvent *event = NSApp.currentEvent;
                  if (event == nil) {
                      return;
                  }
                  [NSMenu popUpContextMenu:menu withEvent:event forView:view];
                }];
}

#endif  // RNX_WIRE_DEV_MENU && TARGET_OS_OSX

@end

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

#if __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)
    return [[RCTFabricSurfaceHostingProxyRootView alloc] initWithBridge:self.bridge
                                                             moduleName:moduleName
                                                      initialProperties:initialProps];
#elif USE_BRIDGELESS
    RCTFabricSurface *surface = [self.reactHost createSurfaceWithModuleName:moduleName
                                                          initialProperties:initialProps];
#if __has_include(<react/renderer/graphics/LinearGradient.h>)  // >=0.77
    return [[RCTSurfaceHostingProxyRootView alloc] initWithSurface:surface];
#else
    // `-initWithSurface:` implicitly calls `start` and causes race conditions.
    // This was fixed in 0.76.7, but for backwards compatibility, we should call
    // `-initWithSurface:sizeMeasureMode` when possible. For more details, see
    // https://github.com/facebook/react-native/pull/47313.
    RCTSurfaceSizeMeasureMode sizeMeasureMode =
        RCTSurfaceSizeMeasureModeWidthExact | RCTSurfaceSizeMeasureModeHeightExact;
    return [[RCTSurfaceHostingProxyRootView alloc] initWithSurface:surface
                                                   sizeMeasureMode:sizeMeasureMode];
#endif  // __has_include(<react/renderer/graphics/LinearGradient.h>)
#else   // __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)
    RCTFabricSurface *surface =
        [[RCTFabricSurface alloc] initWithSurfacePresenter:self.surfacePresenter
                                                moduleName:moduleName
                                         initialProperties:initialProps];
    return [[RCTSurfaceHostingProxyRootView alloc] initWithSurface:surface];
#endif  // __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)
#else
    return [[RCTRootView alloc] initWithBridge:self.bridge
                                    moduleName:moduleName
                             initialProperties:initialProperties];
#endif  // USE_FABRIC
}

@end

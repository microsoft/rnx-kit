#import "ReactNativeHost.h"

#ifdef USE_FABRIC
#if __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)
#import <React/RCTFabricSurfaceHostingProxyRootView.h>
#else
#import <React/RCTFabricSurface.h>
#import <React/RCTSurfaceHostingProxyRootView.h>
#endif  // __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)
#else
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
#if __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)
    return [[RCTFabricSurfaceHostingProxyRootView alloc] initWithBridge:self.bridge
                                                             moduleName:moduleName
                                                      initialProperties:initialProperties];
#else
    RCTFabricSurface *surface = [[RCTFabricSurface alloc] initWithBridge:self.bridge
                                                              moduleName:moduleName
                                                       initialProperties:initialProperties];
    return [[RCTSurfaceHostingProxyRootView alloc] initWithSurface:surface];
#endif  // __has_include(<React/RCTFabricSurfaceHostingProxyRootView.h>)
#else
    return [[RCTRootView alloc] initWithBridge:self.bridge
                                    moduleName:moduleName
                             initialProperties:initialProperties];
#endif  // USE_FABRIC
}

@end

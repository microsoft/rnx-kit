#import "ReactNativeHost.h"

#ifdef USE_FABRIC
#import <React/RCTFabricSurfaceHostingProxyRootView.h>
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
    return [[RCTFabricSurfaceHostingProxyRootView alloc] initWithBridge:self.bridge
                                                             moduleName:moduleName
                                                      initialProperties:initialProperties];
#else
    return [[RCTRootView alloc] initWithBridge:self.bridge
                                    moduleName:moduleName
                             initialProperties:initialProperties];
#endif  // USE_FABRIC
}

@end

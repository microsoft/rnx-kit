#import <React/RCTRootView.h>

#import "ReactNativeHost.h"

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
    return [[RCTRootView alloc] initWithBridge:self.bridge
                                    moduleName:moduleName
                             initialProperties:initialProperties];
}

@end

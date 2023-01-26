#import "ReactNativeHost.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTDevLoadingViewSetEnabled.h>
#import <React/RCTRootView.h>
#import <React/RCTUtils.h>

#import "RNXHostConfig.h"

@implementation ReactNativeHost {
    __weak id<RNXHostConfig> _config;
}

- (instancetype)initWithConfig:(__weak id<RNXHostConfig>)config
{
    if (self = [super init]) {
        if ([config respondsToSelector:@selector(isDevLoadingViewEnabled)]) {
            RCTDevLoadingViewSetEnabled([config isDevLoadingViewEnabled]);
        }

        if ([config respondsToSelector:@selector(logWithLevel:source:filename:line:message:)]) {
            RCTSetLogFunction(^(RCTLogLevel level,
                                RCTLogSource source,
                                NSString *filename,
                                NSNumber *line,
                                NSString *message) {
              [config logWithLevel:level source:source filename:filename line:line message:message];
            });
        }

        if ([config respondsToSelector:@selector(onFatalError:)]) {
            RCTSetFatalHandler(^(NSError *error) {
              [config onFatalError:error];
            });
        }

        _config = config;
        _bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:nil];
    }
    return self;
}

- (void)shutdown
{
    [_bridge invalidate];
    _bridge = nil;
}

- (NSURL *)URLForResource:(NSString *)name
{
    return nil;
}

- (void)usingModule:(Class)moduleClass block:(void (^)(id<RCTBridgeModule> _Nullable))block
{
    const BOOL requiresMainQueueSetup =
        [moduleClass respondsToSelector:@selector(requiresMainQueueSetup)] &&
        [moduleClass requiresMainQueueSetup];
    if (requiresMainQueueSetup && !RCTIsMainQueue()) {
        __weak id weakSelf = self;
        dispatch_async(dispatch_get_main_queue(), ^{
          [weakSelf usingModule:moduleClass block:block];
        });
        return;
    }

    id<RCTBridgeModule> bridgeModule = [self.bridge moduleForClass:moduleClass];
    block(bridgeModule);
}

- (RNXView *)viewWithModuleName:(NSString *)moduleName
              initialProperties:(NSDictionary *)initialProperties;
{
    return [[RCTRootView alloc] initWithBridge:self.bridge
                                    moduleName:moduleName
                             initialProperties:initialProperties];
}

// MARK: - RCTBridgeDelegate details

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
    NSURL *sourceURL = [_config sourceURLForBridge:bridge];
    if (sourceURL != nil) {
        return sourceURL;
    }

    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"
                                                       fallbackURLProvider:^NSURL * {
                                                         return nil;
                                                       }];
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge
{
    return [_config respondsToSelector:@selector(extraModulesForBridge:)]
               ? [_config extraModulesForBridge:bridge]
               : @[];
}

@end

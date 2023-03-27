#import "ReactNativeHost.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTDevLoadingViewSetEnabled.h>
#import <React/RCTUtils.h>

#import "RNXHostConfig.h"
#import "RNXHostReleaser.h"

@implementation ReactNativeHost {
    __weak id<RNXHostConfig> _config;
    RCTBridge *_bridge;
    NSLock *_isShuttingDown;
    RNXHostReleaser *_hostReleaser;
}

- (instancetype)initWithConfig:(id<RNXHostConfig>)config
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
        _isShuttingDown = [[NSLock alloc] init];

        if ([config respondsToSelector:@selector(shouldReleaseBridgeWhenBackgrounded)] &&
            [config shouldReleaseBridgeWhenBackgrounded]) {
            _hostReleaser = [[RNXHostReleaser alloc] initWithHost:self];
        }

        (void)self.bridge;  // Initialize the bridge now
    }
    return self;
}

- (RCTBridge *)bridge
{
    if (![_isShuttingDown tryLock]) {
        NSAssert(NO, @"Tried to access the bridge while shutting down");
        return nil;
    }

    @try {
        if (_bridge == nil) {
            _bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:nil];
            [_hostReleaser setBridge:_bridge];
            if ([_config respondsToSelector:@selector(onBridgeInstantiated:)]) {
                [_config onBridgeInstantiated:_bridge];
            }
        }

        return _bridge;
    } @finally {
        [_isShuttingDown unlock];
    }
}

- (void)shutdown
{
    if ([_config respondsToSelector:@selector(onBridgeWillShutDown:)]) {
        [_config onBridgeWillShutDown:_bridge];
    }

    [_isShuttingDown lock];

    @try {
        [_bridge invalidate];
        _bridge = nil;

        if ([_config respondsToSelector:@selector(onBridgeDidShutDown)]) {
            [_config onBridgeDidShutDown];
        }
    } @finally {
        [_isShuttingDown unlock];
    }
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

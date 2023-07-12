#import "ReactNativeHost.h"

#define FOLLY_NO_CONFIG 1
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wcomma"
#import <cxxreact/JSExecutor.h>
#pragma clang diagnostic pop

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTDevLoadingViewSetEnabled.h>
#import <React/RCTUtils.h>

#import "RNXFabricAdapter.h"
#import "RNXHostConfig.h"
#import "RNXHostReleaser.h"
#import "RNXTurboModuleAdapter.h"

@interface ReactNativeHost () <RCTCxxBridgeDelegate>
@end

@implementation ReactNativeHost {
    __weak id<RNXHostConfig> _config;
    RNXTurboModuleAdapter *_turboModuleAdapter;
    NSObject *_surfacePresenterBridgeAdapter;
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
#if USE_FABRIC || USE_TURBOMODULE
        _turboModuleAdapter = [[RNXTurboModuleAdapter alloc] init];
#endif
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
            _surfacePresenterBridgeAdapter = RNXInstallSurfacePresenterBridgeAdapter(_bridge);
            [_hostReleaser setBridge:_bridge];
        }

        return _bridge;
    } @finally {
        [_isShuttingDown unlock];
    }
}

- (void)shutdown
{
    [_isShuttingDown lock];

    @try {
        [_bridge invalidate];
        _bridge = nil;
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

// MARK: - RCTCxxBridgeDelegate details

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:
    (RCTBridge *)bridge
{
#if USE_TURBOMODULE
    // jsExecutorFactoryForBridge: (USE_TURBOMODULE=1)
    return [_turboModuleAdapter jsExecutorFactoryForBridge:bridge];
#else
    // jsExecutorFactoryForBridge: (USE_TURBOMODULE=0)
    return nullptr;
#endif  // USE_TURBOMODULE
}

// MARK: - Private

@end

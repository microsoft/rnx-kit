#import "ReactNativeHost.h"

#include "FollyConfig.h"
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wcomma"
#import <cxxreact/JSExecutor.h>
#pragma clang diagnostic pop

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTDevLoadingViewSetEnabled.h>
#import <React/RCTUtils.h>

#import "RNXBridgelessHeaders.h"
#import "RNXFabricAdapter.h"
#import "RNXHostConfig.h"
#import "RNXHostReleaser.h"
#import "RNXTurboModuleAdapter.h"

@class RCTSurfacePresenter;

using ReactNativeConfig = facebook::react::EmptyReactNativeConfig const;

#if USE_BRIDGELESS
@interface ReactNativeHost () <RCTContextContainerHandling>
#else
@interface ReactNativeHost () <RCTCxxBridgeDelegate>
#endif  // USE_BRIDGELESS
@end

@implementation ReactNativeHost {
    __weak id<RNXHostConfig> _config;
    NSDictionary *_launchOptions;
    RNXTurboModuleAdapter *_turboModuleAdapter;
    RCTSurfacePresenterBridgeAdapter *_surfacePresenterBridgeAdapter;
    RCTBridge *_bridge;
    RCTHost *_reactHost;
    NSLock *_isShuttingDown;
    RNXHostReleaser *_hostReleaser;
    std::shared_ptr<ReactNativeConfig> _reactNativeConfig;
}

- (instancetype)initWithConfig:(id<RNXHostConfig>)config
{
    return [self initWithConfig:config launchOptions:nil];
}

- (instancetype)initWithConfig:(id<RNXHostConfig>)config launchOptions:(NSDictionary *)launchOptions
{
    if (self = [super init]) {
        _config = config;
        _launchOptions = launchOptions;
        [self enableTurboModule];
        _isShuttingDown = [[NSLock alloc] init];

        if ([config respondsToSelector:@selector(shouldReleaseBridgeWhenBackgrounded)] &&
            [config shouldReleaseBridgeWhenBackgrounded]) {
            _hostReleaser = [[RNXHostReleaser alloc] initWithHost:self];
        }

#ifdef USE_FEATURE_FLAGS
        if (self.isBridgelessEnabled) {
            facebook::react::ReactNativeFeatureFlags::override(
                std::make_unique<RNXBridgelessFeatureFlags>());
        }
#endif  // USE_FEATURE_FLAGS

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

        [self initializeReactHost];
    }
    return self;
}

- (RCTBridge *)bridge
{
    if (self.isBridgelessEnabled) {
        return nil;
    }

    if (![_isShuttingDown tryLock]) {
        NSAssert(NO, @"Tried to access the bridge while shutting down");
        return nil;
    }

    @try {
        if (_bridge == nil) {
            _bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:_launchOptions];
            _surfacePresenterBridgeAdapter = RNXInstallSurfacePresenterBridgeAdapter(_bridge);
            [_hostReleaser setBridge:_bridge];
        }

        return _bridge;
    } @finally {
        [_isShuttingDown unlock];
    }
}

- (RCTHost *)reactHost
{
    return _reactHost;
}

- (RCTSurfacePresenter *)surfacePresenter
{
#if USE_BRIDGELESS
    return [_reactHost respondsToSelector:@selector(surfacePresenter)]
               ? _reactHost.surfacePresenter
               : [_reactHost getSurfacePresenter];
#elif USE_FABRIC
    return [_surfacePresenterBridgeAdapter surfacePresenter];
#else
    return nil;
#endif
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
    BOOL const requiresMainQueueSetup =
        [moduleClass respondsToSelector:@selector(requiresMainQueueSetup)] &&
        [moduleClass requiresMainQueueSetup];
    if (requiresMainQueueSetup && !RCTIsMainQueue()) {
        __weak __typeof(self) weakSelf = self;
        dispatch_async(dispatch_get_main_queue(), ^{
          [weakSelf usingModule:moduleClass block:block];
        });
        return;
    }

    if (!self.isBridgelessEnabled) {
        block([self.bridge moduleForClass:moduleClass]);
        return;
    }

#if USE_BRIDGELESS
    const char *moduleName = RCTBridgeModuleNameForClass(moduleClass).UTF8String;
    RCTModuleRegistry *moduleRegistry = [_reactHost respondsToSelector:@selector(moduleRegistry)]
                                            ? _reactHost.moduleRegistry
                                            : [_reactHost getModuleRegistry];
    block([moduleRegistry moduleForName:moduleName]);
#endif  // USE_BRIDGELESS
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

#if USE_BRIDGELESS

// MARK: - RCTContextContainerHandling details

- (void)didCreateContextContainer:
    (std::shared_ptr<facebook::react::ContextContainer>)contextContainer
{
    contextContainer->insert("ReactNativeConfig", _reactNativeConfig);
}

#else  // USE_BRIDGELESS

// MARK: - RCTCxxBridgeDelegate details

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:
    (RCTBridge *)bridge
{
#if USE_FABRIC
    // jsExecutorFactoryForBridge: (USE_FABRIC=1)
    return [_turboModuleAdapter jsExecutorFactoryForBridge:bridge];
#else
    // jsExecutorFactoryForBridge: (USE_FABRIC=0)
    return nullptr;
#endif  // USE_FABRIC
}

#endif  // USE_BRIDGELESS

// MARK: - Private

- (BOOL)isBridgelessEnabled
{
#if USE_BRIDGELESS
    // Bridgeless mode is enabled if it was turned on with a build flag, unless
    // `isBridgelessEnabled` is explicitly implemented and returns false.
    return ![_config respondsToSelector:@selector(isBridgelessEnabled)] ||
           [_config isBridgelessEnabled];
#else
    return NO;
#endif  // USE_BRIDGELESS
}

- (void)enableTurboModule
{
#if USE_FABRIC
    _turboModuleAdapter = [[RNXTurboModuleAdapter alloc] init];
    RCTEnableTurboModule(true);
#endif
}

- (void)initializeReactHost
{
    if (!self.isBridgelessEnabled) {
        (void)self.bridge;  // Initialize the bridge now
        return;
    }

#if USE_BRIDGELESS
    RCTSetUseNativeViewConfigsInBridgelessMode(YES);
    RCTEnableTurboModuleInterop(YES);
    RCTEnableTurboModuleInteropBridgeProxy(YES);

    _reactNativeConfig = std::make_shared<ReactNativeConfig>();
    std::weak_ptr<ReactNativeConfig> reactNativeConfig{_reactNativeConfig};

    SharedJSRuntimeFactory (^jsEngineProvider)() = ^SharedJSRuntimeFactory {
#if USE_HERMES
      auto config = reactNativeConfig.lock();
      NSAssert(config, @"Expected nonnull ReactNativeConfig instance");
      return std::make_shared<facebook::react::RCTHermesInstance>(config, nullptr);
#else
      return std::make_shared<facebook::react::RCTJscInstance>();
#endif  // USE_HERMES
    };

    __weak __typeof(self) weakSelf = self;
    if ([RCTHost instancesRespondToSelector:@selector
                 (initWithBundleURLProvider:
                               hostDelegate:turboModuleManagerDelegate:jsEngineProvider
                                           :launchOptions:)]) {
        _reactHost = [[RCTHost alloc]
             initWithBundleURLProvider:^{
               return [weakSelf sourceURLForBridge:nil];
             }
                          hostDelegate:nil
            turboModuleManagerDelegate:_turboModuleAdapter
                      jsEngineProvider:jsEngineProvider
                         launchOptions:_launchOptions];
    } else {
        _reactHost = [[RCTHost alloc] initWithBundleURL:[self sourceURLForBridge:nil]
                                           hostDelegate:nil
                             turboModuleManagerDelegate:_turboModuleAdapter
                                       jsEngineProvider:jsEngineProvider];
    }

    [_reactHost setBundleURLProvider:^NSURL *() {
      return [weakSelf sourceURLForBridge:nil];
    }];

    [_reactHost setContextContainerHandler:self];
    [_reactHost start];
#endif  // USE_BRIDGELESS
}

@end

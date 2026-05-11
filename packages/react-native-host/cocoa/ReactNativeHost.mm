#import "ReactNativeHost.h"

// clang-format off
#include "FollyConfig.h"
// clang-format on

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTCxxBridgeDelegate.h>
#import <React/RCTDevLoadingViewSetEnabled.h>
#import <React/RCTUtils.h>

#import "RNXBridgelessHeaders.h"
#import "RNXFabricAdapter.h"
#import "RNXFeatureMacros.h"
#import "RNXHostConfig.h"
#import "RNXHostReleaser.h"
#import "RNXTurboModuleAdapter.h"

@class RCTSurfacePresenter;

#ifdef USE_REACT_NATIVE_CONFIG
using ReactNativeConfig = facebook::react::EmptyReactNativeConfig const;
#endif  // USE_REACT_NATIVE_CONFIG

#if USE_BRIDGELESS
@interface ReactNativeHost () <RCTContextContainerHandling>
#else
@interface ReactNativeHost () <RCTCxxBridgeDelegate>
#endif  // USE_BRIDGELESS
@end

#ifdef USE_CODEGEN_PROVIDER
@interface ReactNativeHost () <RCTComponentViewFactoryComponentProvider>
@end
#endif  // USE_CODEGEN_PROVIDER

#if USE_BRIDGELESS

// Forwards host:didInitializeRuntime: from RCTHost to the consumer's RNXHostConfig.
@interface _RNXForwardingRCTHostDelegate : NSObject <RCTHostDelegate>
- (instancetype)initWithHost:(ReactNativeHost *)host config:(id<RNXHostConfig>)config;
@end

@implementation _RNXForwardingRCTHostDelegate {
    __weak ReactNativeHost *_host;
    __weak id<RNXHostConfig> _config;
}

- (instancetype)initWithHost:(ReactNativeHost *)host config:(id<RNXHostConfig>)config
{
    if (self = [super init]) {
        _host = host;
        _config = config;
    }
    return self;
}

- (void)host:(RCTHost *)host didInitializeRuntime:(facebook::jsi::Runtime &)runtime
{
    id<RNXHostConfig> config = _config;
    ReactNativeHost *forwardedHost = _host;
    if (forwardedHost != nil &&
        [config respondsToSelector:@selector(host:didInitializeRuntime:)]) {
        [config host:forwardedHost didInitializeRuntime:runtime];
    }
}

@end

#endif  // USE_BRIDGELESS

@implementation ReactNativeHost {
    __weak id<RNXHostConfig> _config;
    NSDictionary *_launchOptions;
    RNXTurboModuleAdapter *_turboModuleAdapter;
    RCTSurfacePresenterBridgeAdapter *_surfacePresenterBridgeAdapter;
    RCTBridge *_bridge;
    RCTHost *_reactHost;
    NSLock *_isShuttingDown;
    RNXHostReleaser *_hostReleaser;
#if USE_BRIDGELESS
    _RNXForwardingRCTHostDelegate *_hostDelegateProxy;
#endif  // USE_BRIDGELESS
#ifdef USE_REACT_NATIVE_CONFIG
    std::shared_ptr<ReactNativeConfig> _reactNativeConfig;
#endif  // USE_REACT_NATIVE_CONFIG
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

#ifdef USE_CODEGEN_PROVIDER
        [RCTComponentViewFactory currentComponentViewFactory].thirdPartyFabricComponentsProvider =
            self;
#endif  // USE_CODEGEN_PROVIDER

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

        if ([config respondsToSelector:@selector(host:didLoadInstanceWithError:)]) {
            [[NSNotificationCenter defaultCenter]
                addObserver:self
                   selector:@selector(_rnxInstanceDidLoad:)
                       name:RCTJavaScriptDidLoadNotification
                     object:nil];
            [[NSNotificationCenter defaultCenter]
                addObserver:self
                   selector:@selector(_rnxInstanceDidFailToLoad:)
                       name:RCTJavaScriptDidFailToLoadNotification
                     object:nil];
        }
        if ([config respondsToSelector:@selector(hostWillUnloadInstance:)]) {
            [[NSNotificationCenter defaultCenter]
                addObserver:self
                   selector:@selector(_rnxInstanceWillUnload:)
                       name:RCTBridgeWillBeInvalidatedNotification
                     object:nil];
        }

        [self initializeReactHost];
    }
    return self;
}

- (void)dealloc
{
    [[NSNotificationCenter defaultCenter] removeObserver:self];
}

- (void)_rnxInstanceDidLoad:(NSNotification *)__unused notification
{
    id<RNXHostConfig> config = _config;
    if ([config respondsToSelector:@selector(host:didLoadInstanceWithError:)]) {
        [config host:self didLoadInstanceWithError:nil];
    }
}

- (void)_rnxInstanceDidFailToLoad:(NSNotification *)notification
{
    id<RNXHostConfig> config = _config;
    if ([config respondsToSelector:@selector(host:didLoadInstanceWithError:)]) {
        NSError *error = notification.userInfo[@"error"];
        [config host:self didLoadInstanceWithError:error ?: [NSError errorWithDomain:@"ReactNativeHost"
                                                                                code:0
                                                                            userInfo:nil]];
    }
}

- (void)_rnxInstanceWillUnload:(NSNotification *)__unused notification
{
    id<RNXHostConfig> config = _config;
    if ([config respondsToSelector:@selector(hostWillUnloadInstance:)]) {
        [config hostWillUnloadInstance:self];
    }
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
#ifdef USE_REACT_NATIVE_CONFIG
    contextContainer->insert("ReactNativeConfig", _reactNativeConfig);
#endif  // USE_REACT_NATIVE_CONFIG
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

// MARK: - RCTComponentViewFactoryComponentProvider details

#ifdef USE_CODEGEN_PROVIDER
- (NSDictionary<NSString *, Class<RCTComponentViewProtocol>> *)thirdPartyFabricComponents
{
    return [RCTThirdPartyComponentsProvider thirdPartyFabricComponents];
}
#endif  // USE_CODEGEN_PROVIDER

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
    _turboModuleAdapter.hostConfig = _config;
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
#ifndef USE_UNIFIED_FEATURE_FLAGS
    RCTSetUseNativeViewConfigsInBridgelessMode(YES);
#endif
    RCTEnableTurboModuleInterop(YES);
    RCTEnableTurboModuleInteropBridgeProxy(YES);

#ifdef USE_REACT_NATIVE_CONFIG
    _reactNativeConfig = std::make_shared<ReactNativeConfig>();
    std::weak_ptr<ReactNativeConfig> reactNativeConfig{_reactNativeConfig};
#endif  // USE_REACT_NATIVE_CONFIG

    SharedJSRuntimeFactory (^jsEngineProvider)() = ^SharedJSRuntimeFactory {
#if USE_HERMES
#ifdef USE_REACT_NATIVE_CONFIG
      auto config = reactNativeConfig.lock();
      NSAssert(config, @"Expected nonnull ReactNativeConfig instance");
      return std::make_shared<facebook::react::RCTHermesInstance>(config, nullptr);
#else
      return std::make_shared<facebook::react::RCTHermesInstance>(nullptr, false);
#endif  // USE_REACT_NATIVE_CONFIG
#elif USE_V8
      return std::make_shared<facebook::react::V8ExecutorFactory>();
#else
      return std::make_shared<facebook::react::RCTJscInstance>();
#endif
    };

    // Retained as an ivar because RCTHost stores host delegates weakly.
    _hostDelegateProxy = [[_RNXForwardingRCTHostDelegate alloc] initWithHost:self
                                                                      config:_config];

    __weak __typeof(self) weakSelf = self;
    if ([RCTHost instancesRespondToSelector:@selector
                 (initWithBundleURLProvider:
                               hostDelegate:turboModuleManagerDelegate:jsEngineProvider
                                           :launchOptions:)]) {
        _reactHost = [[RCTHost alloc]
             initWithBundleURLProvider:^{
               return [weakSelf sourceURLForBridge:nil];
             }
                          hostDelegate:_hostDelegateProxy
            turboModuleManagerDelegate:_turboModuleAdapter
                      jsEngineProvider:jsEngineProvider
                         launchOptions:_launchOptions];
    } else {
        _reactHost = [[RCTHost alloc] initWithBundleURL:[self sourceURLForBridge:nil]
                                           hostDelegate:_hostDelegateProxy
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

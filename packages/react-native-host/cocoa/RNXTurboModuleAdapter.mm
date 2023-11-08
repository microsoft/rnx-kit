#import "RNXTurboModuleAdapter.h"

#define FOLLY_NO_CONFIG 1
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wcomma"
#import <cxxreact/JSExecutor.h>
#pragma clang diagnostic pop

#if USE_TURBOMODULE
#import <React/CoreModulesPlugins.h>
#import <ReactCommon/RCTTurboModuleManager.h>

#if __has_include(<React/RCTAppSetupUtils.h>)  // <0.72
#import <React/RCTAppSetupUtils.h>
#define USE_RUNTIME_SCHEDULER 0
#else
#import <React-RCTAppDelegate/RCTAppSetupUtils.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>

// We still get into this path because react-native-macos 0.71 picked up some
// 0.72 bits. AFAICT, `RCTLegacyInteropComponents.h` is a new addition in 0.72
// in both react-native and react-native-macos.
#if __has_include(<React-RCTAppDelegate/RCTLegacyInteropComponents.h>)
#import <React-RCTAppDelegate/RCTLegacyInteropComponents.h>
#import <React/RCTLegacyViewManagerInteropComponentView.h>
#import <react/renderer/runtimescheduler/RuntimeScheduler.h>
#import <react/renderer/runtimescheduler/RuntimeSchedulerCallInvoker.h>
#if __has_include(<React/RCTRuntimeExecutorFromBridge.h>)
#import <React/RCTRuntimeExecutorFromBridge.h>
#endif  // __has_include(<React/RCTRuntimeExecutorFromBridge.h>)
#define SUPPORTS_LEGACY_COMPONENTS 1
#define USE_RUNTIME_SCHEDULER 1
#else
#define SUPPORTS_LEGACY_COMPONENTS 0
#define USE_RUNTIME_SCHEDULER 0
#endif  // __has_include(<React-RCTAppDelegate/RCTLegacyInteropComponents.h>)

#endif  // __has_include(<React/RCTAppSetupUtils.h>)

#endif  // USE_TURBOMODULE

@implementation RNXTurboModuleAdapter {
#if USE_TURBOMODULE
    RCTTurboModuleManager *_turboModuleManager;
#endif  // USE_TURBOMODULE
#if USE_RUNTIME_SCHEDULER
    std::shared_ptr<facebook::react::RuntimeScheduler> _runtimeScheduler;
#endif  // USE_RUNTIME_SCHEDULER
}

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:
    (RCTBridge *)bridge
{
#if USE_TURBOMODULE
    [self registerLegacyViewManagers];
    // jsExecutorFactoryForBridge: (USE_TURBOMODULE=1)
    return [self initJsExecutorFactoryWithBridge:bridge];
#else
    // jsExecutorFactoryForBridge: (USE_TURBOMODULE=0)
    return nullptr;
#endif  // USE_TURBOMODULE
}

#if USE_TURBOMODULE

// MARK: - RCTTurboModuleManagerDelegate details

- (Class)getModuleClassFromName:(const char *)name
{
    return RCTCoreModulesClassProvider(name);
}

- (std::shared_ptr<facebook::react::TurboModule>)
    getTurboModule:(const std::string &)name
         jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
    return nullptr;
}

- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass
{
    return RCTAppSetupDefaultModuleFromClass(moduleClass);
}

// MARK: - Private

- (std::unique_ptr<facebook::react::JSExecutorFactory>)initJsExecutorFactoryWithBridge:(RCTBridge *)bridge
{
#if USE_RUNTIME_SCHEDULER
    _runtimeScheduler =
        std::make_shared<facebook::react::RuntimeScheduler>(RCTRuntimeExecutorFromBridge(bridge));
    auto callInvoker =
        std::make_shared<facebook::react::RuntimeSchedulerCallInvoker>(_runtimeScheduler);
    _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge
                                                               delegate:self
                                                              jsInvoker:callInvoker];
    return RCTAppSetupDefaultJsExecutorFactory(bridge, _turboModuleManager, _runtimeScheduler);
#else
    _turboModuleManager = [[RCTTurboModuleManager alloc] initWithBridge:bridge
                                                               delegate:self
                                                              jsInvoker:bridge.jsCallInvoker];
    return RCTAppSetupDefaultJsExecutorFactory(bridge, _turboModuleManager);
#endif  // USE_RUNTIME_SCHEDULER
}

- (void)registerLegacyViewManagers
{
#if SUPPORTS_LEGACY_COMPONENTS
    for (NSString *legacyComponent in [RCTLegacyInteropComponents legacyInteropComponents]) {
        [RCTLegacyViewManagerInteropComponentView supportLegacyViewManagerWithName:legacyComponent];
    }
#endif  // SUPPORTS_LEGACY_COMPONENTS
}

#endif  // USE_TURBOMODULE

@end

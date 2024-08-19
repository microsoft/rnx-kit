#import "RNXTurboModuleAdapter.h"

#include "FollyConfig.h"
#pragma clang diagnostic push
#pragma clang diagnostic ignored "-Wcomma"
#import <cxxreact/JSExecutor.h>
#pragma clang diagnostic pop

#if USE_FABRIC
#import <React/CoreModulesPlugins.h>
#import <ReactCommon/RCTTurboModuleManager.h>

#if __has_include(<React/RCTAppSetupUtils.h>)  // <0.72
#import <React/RCTAppSetupUtils.h>
#else

#if __has_include(<React-RCTAppDelegate/RCTAppSetupUtils.h>)
#import <React-RCTAppDelegate/RCTAppSetupUtils.h>
#elif __has_include(<React_RCTAppDelegate/RCTAppSetupUtils.h>)  // use_frameworks!
#import <React_RCTAppDelegate/RCTAppSetupUtils.h>
#endif  // __has_include(<React-RCTAppDelegate/RCTAppSetupUtils.h>)

#import <React/RCTSurfacePresenterBridgeAdapter.h>

// We still get into this path because react-native-macos 0.71 picked up some
// 0.72 bits. AFAICT, `SchedulerPriorityUtils.h` is a new addition in 0.72 in
// both react-native and react-native-macos.
#if __has_include(<react/renderer/runtimescheduler/SchedulerPriorityUtils.h>)

#if __has_include(<React-RCTAppDelegate/RCTLegacyInteropComponents.h>)  // <0.74
#import <React-RCTAppDelegate/RCTLegacyInteropComponents.h>
#define MANUALLY_REGISTER_LEGACY_COMPONENTS 1
#elif __has_include(<React_RCTAppDelegate/RCTLegacyInteropComponents.h>)  // use_frameworks!
#import <React_RCTAppDelegate/RCTLegacyInteropComponents.h>
#define MANUALLY_REGISTER_LEGACY_COMPONENTS 1
#endif  // __has_include(<React-RCTAppDelegate/RCTLegacyInteropComponents.h>)

#import <React/RCTLegacyViewManagerInteropComponentView.h>
#import <react/renderer/runtimescheduler/RuntimeScheduler.h>
#import <react/renderer/runtimescheduler/RuntimeSchedulerCallInvoker.h>

#if __has_include(<React/RCTRuntimeExecutorFromBridge.h>)
#import <React/RCTRuntimeExecutorFromBridge.h>
#endif  // __has_include(<React/RCTRuntimeExecutorFromBridge.h>)

#define USE_RUNTIME_SCHEDULER 1
#endif  // __has_include(<react/renderer/runtimescheduler/SchedulerPriorityUtils.h>)

#endif  // __has_include(<React/RCTAppSetupUtils.h>)

#if __has_include(<react/nativemodule/defaults/DefaultTurboModules.h>)  // >= 0.75
#import <react/nativemodule/defaults/DefaultTurboModules.h>
#endif

#endif  // USE_FABRIC

@implementation RNXTurboModuleAdapter {
#if USE_FABRIC
    RCTTurboModuleManager *_turboModuleManager;
#endif  // USE_FABRIC
#if USE_RUNTIME_SCHEDULER
    std::shared_ptr<facebook::react::RuntimeScheduler> _runtimeScheduler;
#endif  // USE_RUNTIME_SCHEDULER
}

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:
    (RCTBridge *)bridge
{
#if USE_FABRIC
#if MANUALLY_REGISTER_LEGACY_COMPONENTS
    for (NSString *legacyComponent in [RCTLegacyInteropComponents legacyInteropComponents]) {
        [RCTLegacyViewManagerInteropComponentView supportLegacyViewManagerWithName:legacyComponent];
    }
#endif  // MANUALLY_REGISTER_LEGACY_COMPONENTS
    // jsExecutorFactoryForBridge: (USE_FABRIC=1)
    return [self initJsExecutorFactoryWithBridge:bridge];
#else
    // jsExecutorFactoryForBridge: (USE_FABRIC=0)
    return nullptr;
#endif  // USE_FABRIC
}

#if USE_FABRIC

// MARK: - RCTTurboModuleManagerDelegate details

- (Class)getModuleClassFromName:(char const *)name
{
    return RCTCoreModulesClassProvider(name);
}

- (std::shared_ptr<facebook::react::TurboModule>)
    getTurboModule:(std::string const &)name
         jsInvoker:(std::shared_ptr<facebook::react::CallInvoker>)jsInvoker
{
#if __has_include(<react/nativemodule/defaults/DefaultTurboModules.h>)  // >= 0.75
    return facebook::react::DefaultTurboModules::getTurboModule(name, jsInvoker);
#else
    return nullptr;
#endif  // __has_include(<react/nativemodule/defaults/DefaultTurboModules.h>)
}

- (id<RCTTurboModule>)getModuleInstanceFromClass:(Class)moduleClass
{
    return RCTAppSetupDefaultModuleFromClass(moduleClass);
}

// MARK: - Private

- (std::unique_ptr<facebook::react::JSExecutorFactory>)initJsExecutorFactoryWithBridge:
    (RCTBridge *)bridge
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

#endif  // USE_FABRIC

@end

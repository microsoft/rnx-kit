#if USE_BRIDGELESS

#if __has_include(<react/config/ReactNativeConfig.h>)
#define USE_REACT_NATIVE_CONFIG 1
#endif  // __has_include(<react/config/ReactNativeConfig.h>)

#if __has_include(<react/featureflags/ReactNativeFeatureFlags.h>)
#define USE_FEATURE_FLAGS 1
#endif  // __has_include(<react/featureflags/ReactNativeFeatureFlags.h>)

#if __has_include(<ReactCodegen/RCTThirdPartyComponentsProvider.h>)
#define USE_CODEGEN_PROVIDER 1
#endif  // __has_include(<ReactCodegen/RCTThirdPartyComponentsProvider.h>)

#ifdef USE_FEATURE_FLAGS

#if __has_include(<React-RCTAppDelegate/RCTArchConfiguratorProtocol.h>) || __has_include(<React_RCTAppDelegate/RCTArchConfiguratorProtocol.h>)
#define USE_UNIFIED_FEATURE_FLAGS 1
#endif  // __has_include(<React-RCTAppDelegate/RCTArchConfiguratorProtocol.h>)

#if !__has_include(<React-RCTAppDelegate/RCTReactNativeFactory.h>) && !__has_include(<React_RCTAppDelegate/RCTReactNativeFactory.h>)
#define USE_VIEW_COMMAND_RACE_FIX 1
#endif  // !__has_include(<React-RCTAppDelegate/RCTReactNativeFactory.h>)

#if __has_include(<React-RCTAppDelegate/RCTJSRuntimeConfiguratorProtocol.h>) || __has_include(<React_RCTAppDelegate/RCTJSRuntimeConfiguratorProtocol.h>)
#define USE_UPDATE_RUNTIME_SHADOW_NODE_REFS_ON_COMMIT 1
#endif  // __has_include(<React-RCTAppDelegate/RCTJSRuntimeConfiguratorProtocol.h>)

#endif  // USE_FEATURE_FLAGS

#endif  // USE_BRIDGELESS

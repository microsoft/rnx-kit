#pragma once

#if __has_include(<cxxreact/ReactNativeVersion.h>)
#include <cxxreact/ReactNativeVersion.h>
#define REACT_NATIVE_VERSION                                                                       \
    REACT_NATIVE_VERSION_MAJOR * 1000000 + REACT_NATIVE_VERSION_MINOR * 1000 +                     \
        REACT_NATIVE_VERSION_PATCH
#else
#define REACT_NATIVE_VERSION 0
#endif  // __has_include(<cxxreact/ReactNativeVersion.h>)

// Force enable New Architecture if it cannot be disabled (>= 0.82). Build
// systems that don't set preprocessor definitions (e.g. SwiftPM) rely on this.
#if !USE_FABRIC && REACT_NATIVE_VERSION >= 82000
#ifdef USE_FABRIC
#undef USE_FABRIC
#endif  // USE_FABRIC
#define USE_FABRIC 1
#endif  // !USE_FABRIC && REACT_NATIVE_VERSION >= 82000

// Force enable Hermes if JSC is not available
#if !__has_include(<ReactCommon/RCTJscInstance.h>)
#ifdef USE_HERMES
#undef USE_HERMES
#endif  // USE_HERMES
#define USE_HERMES 1
#endif  // !__has_include(<ReactCommon/RCTJscInstance.h>)

// Force enable bridgeless mode if New Architecture is enabled and requires it
#if USE_FABRIC && !__has_include(<react/config/ReactNativeConfig.h>)
#ifdef USE_BRIDGELESS
#undef USE_BRIDGELESS
#endif  // USE_BRIDGELESS
#define USE_BRIDGELESS 1
#endif  // USE_FABRIC && !__has_include(<react/config/ReactNativeConfig.h>)

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

#if REACT_NATIVE_VERSION >= 80000
#define USE_FEATURE_FLAGS_OSS_OVERRIDES 1
#define USE_UNIFIED_FEATURE_FLAGS 1
#elif __has_include(<React-RCTAppDelegate/RCTArchConfiguratorProtocol.h>) || __has_include(<React_RCTAppDelegate/RCTArchConfiguratorProtocol.h>)
#define USE_UNIFIED_FEATURE_FLAGS 1
#endif  // REACT_NATIVE_VERSION >= 80000

#if !__has_include(<React-RCTAppDelegate/RCTReactNativeFactory.h>) && !__has_include(<React_RCTAppDelegate/RCTReactNativeFactory.h>)
#define USE_VIEW_COMMAND_RACE_FIX 1
#endif  // !__has_include(<React-RCTAppDelegate/RCTReactNativeFactory.h>)

// `useShadowNodeStateOnClone` should be enabled from 0.79 and is on by default in 0.85
#if REACT_NATIVE_VERSION >= 79000 && REACT_NATIVE_VERSION < 85000
#define USE_UPDATE_RUNTIME_SHADOW_NODE_REFS_ON_COMMIT 1
#endif  // REACT_NATIVE_VERSION >= 79000 && REACT_NATIVE_VERSION < 85000

#if REACT_NATIVE_VERSION >= 87000
#define RCT_REMOVE_LEGACY_ARCH 1
#endif  // REACT_NATIVE_VERSION >= 87000

#endif  // USE_FEATURE_FLAGS

#endif  // USE_BRIDGELESS

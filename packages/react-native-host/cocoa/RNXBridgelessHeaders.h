#if USE_BRIDGELESS

#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <ReactCommon/RCTHost+Internal.h>
#import <ReactCommon/RCTHost.h>

#if USE_HERMES
#import <ReactCommon/RCTHermesInstance.h>
#else
#import <ReactCommon/RCTJscInstance.h>
#endif  // USE_HERMES

#import <react/config/ReactNativeConfig.h>

#if __has_include(<react/runtime/JSEngineInstance.h>)
using SharedJSRuntimeFactory = std::shared_ptr<facebook::react::JSEngineInstance>;
#else
using SharedJSRuntimeFactory = std::shared_ptr<facebook::react::JSRuntimeFactory>;
#endif  // __has_include(<react/runtime/JSEngineInstance.h>)

#elif USE_FABRIC

#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <react/config/ReactNativeConfig.h>

@class RCTHost;

#else

@class RCTHost;
@class RCTSurfacePresenterBridgeAdapter;

namespace facebook::react
{
    class EmptyReactNativeConfig
    {
    };
}  // namespace facebook::react

#endif  // USE_BRIDGELESS

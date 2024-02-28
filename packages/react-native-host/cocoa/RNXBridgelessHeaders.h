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

// For details, see
// https://github.com/facebook/react-native/commit/c3b0a8f1626939cf5c7b3864a5acf9d3dad26fb3
@interface RCTHost (Compatibility)
@property (nonatomic, readonly) RCTModuleRegistry *moduleRegistry;      // Introduced in 0.74
@property (nonatomic, readonly) RCTSurfacePresenter *surfacePresenter;  // Introduced in 0.74
- (RCTModuleRegistry *)getModuleRegistry;      // Deprecated in 0.74, and removed in 0.75
- (RCTSurfacePresenter *)getSurfacePresenter;  // Deprecated in 0.74, and removed in 0.75
@end

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

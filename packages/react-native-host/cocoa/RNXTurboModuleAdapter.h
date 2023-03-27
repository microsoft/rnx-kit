#include <memory>

#import <Foundation/Foundation.h>

#if USE_TURBOMODULE
#import <ReactCommon/RCTTurboModuleManager.h>
#endif  // USE_TURBOMODULE

@class RCTBridge;

namespace facebook::react
{
    class JSExecutorFactory;
}  // namespace facebook::react

NS_ASSUME_NONNULL_BEGIN

#if USE_TURBOMODULE
@interface RNXTurboModuleAdapter : NSObject <RCTTurboModuleManagerDelegate>
#else
@interface RNXTurboModuleAdapter : NSObject
#endif  // USE_TURBOMODULE

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:
    (RCTBridge *)bridge;

@end

NS_ASSUME_NONNULL_END

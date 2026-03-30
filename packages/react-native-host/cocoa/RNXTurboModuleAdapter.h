#include <memory>

#import <Foundation/Foundation.h>
#include <cxxreact/JSExecutor.h>

#if USE_FABRIC
#import <ReactCommon/RCTTurboModuleManager.h>
#endif  // USE_FABRIC

@class RCTBridge;

NS_ASSUME_NONNULL_BEGIN

#if USE_FABRIC
@interface RNXTurboModuleAdapter : NSObject <RCTTurboModuleManagerDelegate>
#else
@interface RNXTurboModuleAdapter : NSObject
#endif  // USE_FABRIC

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:
    (RCTBridge *)bridge;

@end

NS_ASSUME_NONNULL_END

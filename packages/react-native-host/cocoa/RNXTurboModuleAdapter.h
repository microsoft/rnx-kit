#include <memory>

#import <Foundation/Foundation.h>
#include <cxxreact/JSExecutor.h>

#if USE_FABRIC
#import <ReactCommon/RCTTurboModuleManager.h>
#endif  // USE_FABRIC

@class RCTBridge;
@protocol RNXHostConfig;

NS_ASSUME_NONNULL_BEGIN

#if USE_FABRIC
@interface RNXTurboModuleAdapter : NSObject <RCTTurboModuleManagerDelegate>
#else
@interface RNXTurboModuleAdapter : NSObject
#endif  // USE_FABRIC

/// Weak reference to the host's config; powers consultation of
/// ``RNXHostConfig.turboModuleManagerDelegate``.
@property (nonatomic, weak, nullable) id<RNXHostConfig> hostConfig;

- (std::unique_ptr<facebook::react::JSExecutorFactory>)jsExecutorFactoryForBridge:
    (RCTBridge *)bridge;

@end

NS_ASSUME_NONNULL_END

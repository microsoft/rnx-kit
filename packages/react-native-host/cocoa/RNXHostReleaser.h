#import <Foundation/Foundation.h>

@class RCTBridge;
@class ReactNativeHost;

NS_ASSUME_NONNULL_BEGIN

/// Releases resources held by a `ReactNativeHost` instance based on app state.
@interface RNXHostReleaser : NSObject

- (instancetype)init NS_UNAVAILABLE;

- (nullable instancetype)initWithHost:(ReactNativeHost *)host NS_DESIGNATED_INITIALIZER;

- (void)setBridge:(RCTBridge *)bridge;

@end

NS_ASSUME_NONNULL_END

#import "ReactNativeHost.h"

@class RCTSurfacePresenter;

NS_ASSUME_NONNULL_BEGIN

@interface ReactNativeHost (Private)

/// Returns the current ``RCTSurfacePresenter`` instance.
///
/// - Note: Returns `nil` if New Architecture is not enabled.
@property (nonatomic, readonly, nullable) RCTSurfacePresenter *surfacePresenter;

@end

NS_ASSUME_NONNULL_END

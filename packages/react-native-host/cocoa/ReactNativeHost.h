#import <Foundation/Foundation.h>

#import <React/RCTBridgeDelegate.h>

#import "RNXHostConfig.h"

#if TARGET_OS_OSX
@class NSView;
typedef NSView RNXView;
#else
@class UIView;
typedef UIView RNXView;
#endif

NS_ASSUME_NONNULL_BEGIN

/// Hosts a React Native instance.
@interface ReactNativeHost : NSObject <RCTBridgeDelegate>

@property (nonatomic, readonly, nullable) RCTBridge *bridge;

- (instancetype)init NS_UNAVAILABLE;

- (instancetype)initWithConfig:(__weak id<RNXHostConfig>)config NS_DESIGNATED_INITIALIZER
    NS_SWIFT_NAME(init(_:));

- (void)shutdown;

/// Returns the URL to the specified resource.
- (nullable NSURL *)URLForResource:(nullable NSString *)name;

/// Calls the specified block when the desired native module is retrieved. Note
/// that this may initialize the module.
///
/// - Parameters:
///     - moduleClass: Class of the native module to initialize or retrieve
///     - block: Block that gets called when the native module is retrieved
- (void)usingModule:(Class)moduleClass
              block:(void (^)(id<RCTBridgeModule> _Nullable))block
    NS_SWIFT_NAME(using(module:block:));

/// Creates a React root view with the specified module and initial properties.
///
/// - Parameters:
///     - moduleName: Name of the module to create root view of
///     - initialProperties: Properties passed to the module
- (RNXView *)viewWithModuleName:(NSString *)moduleName
              initialProperties:(nullable NSDictionary *)initialProperties
    NS_SWIFT_NAME(view(moduleName:initialProperties:));

@end

NS_ASSUME_NONNULL_END

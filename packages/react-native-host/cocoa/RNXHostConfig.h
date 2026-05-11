#import <Foundation/Foundation.h>

#import <React/RCTBridgeDelegate.h>
#import <React/RCTLog.h>

#ifdef __cplusplus
#include <jsi/jsi.h>
#endif

#if __has_include(<ReactCommon/RCTTurboModuleManager.h>)
#import <ReactCommon/RCTTurboModuleManager.h>
#endif

@class ReactNativeHost;

NS_ASSUME_NONNULL_BEGIN

/// Configuration object for ``ReactNativeHost``.
@protocol RNXHostConfig <RCTBridgeDelegate>

@optional

/// Returns whether the new initialization layer is enabled.
@property (nonatomic, readonly) BOOL isBridgelessEnabled;

/// Returns whether the loading view should be visible while loading JavaScript.
@property (nonatomic, readonly) BOOL isDevLoadingViewEnabled;

/// Returns whether the bridge should be released when the app is backgrounded.
@property (nonatomic, readonly) BOOL shouldReleaseBridgeWhenBackgrounded;

#if __has_include(<ReactCommon/RCTTurboModuleManager.h>)
/// Auxiliary ``RCTTurboModuleManagerDelegate`` consulted before
/// ``RNXTurboModuleAdapter``'s defaults. For each delegate method the
/// adapter implements, the auxiliary is called via ``respondsToSelector:``
/// first; returning ``nil`` / ``Nil`` falls through to default behavior.
@property (nonatomic, readonly, weak, nullable) id<RCTTurboModuleManagerDelegate> turboModuleManagerDelegate;
#endif

/// Logs a message.
- (void)logWithLevel:(RCTLogLevel)level
              source:(RCTLogSource)source
            filename:(NSString *)filename
                line:(NSNumber *)line
             message:(NSString *)message
    __attribute__((__swift_name__("log(_:source:filename:line:message:)")));

/// Handles a fatal error.
- (void)onFatalError:(NSError *)error;

/// Called after the JS instance has finished loading. ``error`` is ``nil``
/// on success.
- (void)host:(ReactNativeHost *)host didLoadInstanceWithError:(nullable NSError *)error
    __attribute__((__swift_name__("host(_:didLoadInstanceWithError:)")));

/// Called when the instance is about to be unloaded.
- (void)hostWillUnloadInstance:(ReactNativeHost *)host;

#ifdef __cplusplus
/// Called after host bindings install but before the user JS bundle loads.
/// Use to evaluate pre-user JS on the runtime. Bridgeless mode only.
- (void)host:(ReactNativeHost *)host didInitializeRuntime:(facebook::jsi::Runtime &)runtime;
#endif  // __cplusplus

// MARK: - RCTBridgeDelegate deprecated details (for backwards compatibility) [>=0.84]

- (NSURL *__nullable)sourceURLForBridge:(RCTBridge *)bridge;
- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge;

@end

NS_ASSUME_NONNULL_END

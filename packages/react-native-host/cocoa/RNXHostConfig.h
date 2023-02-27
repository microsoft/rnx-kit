#import <Foundation/Foundation.h>

#import <React/RCTBridgeDelegate.h>
#import <React/RCTLog.h>

NS_ASSUME_NONNULL_BEGIN

/// Configuration object for ``ReactNativeHost``.
@protocol RNXHostConfig <RCTBridgeDelegate>

@optional

/// Returns whether the loading view should be visible while loading JavaScript.
@property (nonatomic, readonly) BOOL isDevLoadingViewEnabled;

/// Returns whether the bridge should be released when the app is backgrounded.
@property (nonatomic, readonly) BOOL shouldReleaseBridgeWhenBackgrounded;

/// Logs a message.
- (void)logWithLevel:(RCTLogLevel)level
              source:(RCTLogSource)source
            filename:(NSString *)filename
                line:(NSNumber *)line
             message:(NSString *)message
    __attribute__((__swift_name__("log(_:source:filename:line:message:)")));

// Called when the bridge has been instantiated.
- (void)onBridgeInstantiated:(RCTBridge *)bridge;

// Called when the bridge is about to be shut down.
- (void)onBridgeWillShutDown:(RCTBridge *)bridge;

// Called when the bridge has been shut down.
- (void)onBridgeDidShutDown;

/// Handles a fatal error.
- (void)onFatalError:(NSError *)error;

@end

NS_ASSUME_NONNULL_END

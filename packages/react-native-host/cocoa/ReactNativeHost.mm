#import "ReactNativeHost.h"

#import <React/RCTBridge.h>
#import <React/RCTBundleURLProvider.h>
#import <React/RCTDevLoadingViewSetEnabled.h>
#import <React/RCTRootView.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerUtils.h>
#import <React/RCTUtils.h>

#import "RNXHostConfig.h"

@implementation ReactNativeHost {
    __weak id<RNXHostConfig> _config;
    RCTBridge *_bridge;
    __weak NSDictionary<NSNumber *, UIView *> *_viewRegistry;
    NSLock *_isShuttingDown;
    BOOL _isObservingAppDidEnterBackgroundNotification;
}

- (instancetype)initWithConfig:(__weak id<RNXHostConfig>)config
{
    if (self = [super init]) {
        if ([config respondsToSelector:@selector(isDevLoadingViewEnabled)]) {
            RCTDevLoadingViewSetEnabled([config isDevLoadingViewEnabled]);
        }

        if ([config respondsToSelector:@selector(logWithLevel:source:filename:line:message:)]) {
            RCTSetLogFunction(^(RCTLogLevel level,
                                RCTLogSource source,
                                NSString *filename,
                                NSNumber *line,
                                NSString *message) {
              [config logWithLevel:level source:source filename:filename line:line message:message];
            });
        }

        if ([config respondsToSelector:@selector(onFatalError:)]) {
            RCTSetFatalHandler(^(NSError *error) {
              [config onFatalError:error];
            });
        }

        _config = config;
        _isShuttingDown = [[NSLock alloc] init];

        (void)self.bridge;  // Initialize the bridge now
    }
    return self;
}

- (RCTBridge *)bridge
{
    if (![_isShuttingDown tryLock]) {
        NSAssert(NO, @"Tried to access the bridge while shutting down");
        return nil;
    }

    @try {
        if (_bridge == nil) {
            _bridge = [[RCTBridge alloc] initWithDelegate:self launchOptions:nil];
            [self releaseBridgeWhenBackgrounded];
            if ([_config respondsToSelector:@selector(onBridgeInstantiated:)]) {
                [_config onBridgeInstantiated:_bridge];
            }
        }

        return _bridge;
    } @finally {
        [_isShuttingDown unlock];
    }
}

- (void)shutdown
{
    if ([_config respondsToSelector:@selector(onBridgeWillShutDown:)]) {
        [_config onBridgeWillShutDown:_bridge];
    }

    [_isShuttingDown lock];

    @try {
        [_bridge invalidate];
        _bridge = nil;

        if ([_config respondsToSelector:@selector(onBridgeDidShutDown)]) {
            [_config onBridgeDidShutDown];
        }
    } @finally {
        [_isShuttingDown unlock];
    }
}

- (void)usingModule:(Class)moduleClass block:(void (^)(id<RCTBridgeModule> _Nullable))block
{
    const BOOL requiresMainQueueSetup =
        [moduleClass respondsToSelector:@selector(requiresMainQueueSetup)] &&
        [moduleClass requiresMainQueueSetup];
    if (requiresMainQueueSetup && !RCTIsMainQueue()) {
        __weak id weakSelf = self;
        dispatch_async(dispatch_get_main_queue(), ^{
          [weakSelf usingModule:moduleClass block:block];
        });
        return;
    }

    id<RCTBridgeModule> bridgeModule = [self.bridge moduleForClass:moduleClass];
    block(bridgeModule);
}

// MARK: - RCTBridgeDelegate details

- (NSURL *)sourceURLForBridge:(RCTBridge *)bridge
{
    NSURL *sourceURL = [_config sourceURLForBridge:bridge];
    if (sourceURL != nil) {
        return sourceURL;
    }

    return [[RCTBundleURLProvider sharedSettings] jsBundleURLForBundleRoot:@"index"
                                                       fallbackURLProvider:^NSURL * {
                                                         return nil;
                                                       }];
}

- (NSArray<id<RCTBridgeModule>> *)extraModulesForBridge:(RCTBridge *)bridge
{
    return [_config respondsToSelector:@selector(extraModulesForBridge:)]
               ? [_config extraModulesForBridge:bridge]
               : @[];
}

// MARK: - Category: View

+ (instancetype)hostFromRootView:(RNXView *)rootView
{
    if (![rootView respondsToSelector:@selector(bridge)]) {
        return nil;
    }

    id bridge = [rootView performSelector:@selector(bridge)];
    if (![bridge respondsToSelector:@selector(delegate)]) {
        return nil;
    }

    id delegate = [bridge performSelector:@selector(delegate)];
    if (![delegate isKindOfClass:self]) {
        return nil;
    }

    return delegate;
}

- (RNXView *)viewWithModuleName:(NSString *)moduleName
              initialProperties:(NSDictionary *)initialProperties;
{
    return [[RCTRootView alloc] initWithBridge:self.bridge
                                    moduleName:moduleName
                             initialProperties:initialProperties];
}

// MARK: - Private

- (void)onAppDidEnterBackground:(NSNotification *)note
{
    if (_viewRegistry.count == 0) {
        [self shutdown];
    }
}

- (void)releaseBridgeWhenBackgrounded
{
#if !TARGET_OS_OSX
    if (![_config respondsToSelector:@selector(shouldReleaseBridgeWhenBackgrounded)] ||
        ![_config shouldReleaseBridgeWhenBackgrounded]) {
        return;
    }

    // This may initialize `RCTAccessibilityManager` and must therefore be run
    // on the main queue.
    __weak typeof(self) weakSelf = self;
    RCTExecuteOnMainQueue(^{
      typeof(self) strongSelf = weakSelf;
      if (strongSelf == nil) {
          return;
      }

      RCTBridge *bridge = strongSelf->_bridge;
      RCTUIManager *manager = bridge.uiManager;
      if (manager == nil) {
          return;
      }

      // `addUIBlock` must be called on the UIManager queue.
      RCTExecuteOnUIManagerQueue(^{
        [manager addUIBlock:^(RCTUIManager *uiManager,
                              NSDictionary<NSNumber *, UIView *> *viewRegistry) {
          typeof(self) strongSelf = weakSelf;
          if (strongSelf == nil) {
              return;
          }

          strongSelf->_viewRegistry = viewRegistry;
        }];
      });
    });

    if (!_isObservingAppDidEnterBackgroundNotification) {
        _isObservingAppDidEnterBackgroundNotification = YES;
        NSNotificationCenter *notificationCenter = NSNotificationCenter.defaultCenter;
        [notificationCenter addObserver:self
                               selector:@selector(onAppDidEnterBackground:)
                                   name:UIApplicationDidEnterBackgroundNotification
                                 object:nil];
    }
#endif  // !TARGET_OS_OSX
}

@end

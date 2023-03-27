#import "RNXHostReleaser.h"

#import <React/RCTBridge.h>
#import <React/RCTUIManager.h>
#import <React/RCTUIManagerUtils.h>

#import "ReactNativeHost.h"

@implementation RNXHostReleaser {
#if !TARGET_OS_OSX
    __weak ReactNativeHost *_host;
    __weak NSDictionary<NSNumber *, UIView *> *_viewRegistry;
#endif  // !TARGET_OS_OSX
}

- (instancetype)initWithHost:(ReactNativeHost *)host
{
    if (self = [super init]) {
#if !TARGET_OS_OSX
        _host = host;

        NSNotificationCenter *notificationCenter = NSNotificationCenter.defaultCenter;
        [notificationCenter addObserver:self
                               selector:@selector(onAppDidEnterBackground:)
                                   name:UIApplicationDidEnterBackgroundNotification
                                 object:nil];
#endif  // !TARGET_OS_OSX
    }
    return self;
}

- (void)setBridge:(__weak RCTBridge *)bridge
{
#if !TARGET_OS_OSX
    // This may initialize `RCTAccessibilityManager` and must therefore be run
    // on the main queue.
    __weak typeof(self) weakSelf = self;
    RCTExecuteOnMainQueue(^{
      typeof(self) strongSelf = weakSelf;
      if (strongSelf == nil) {
          return;
      }

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
#endif  // !TARGET_OS_OSX
}

#if !TARGET_OS_OSX
- (void)onAppDidEnterBackground:(NSNotification *)note
{
    if (_viewRegistry.count == 0) {
        [_host shutdown];
    }
}
#endif  // !TARGET_OS_OSX

@end

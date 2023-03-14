#import "RNXFabricAdapter.h"

#ifdef USE_FABRIC
#import <React/RCTSurfacePresenter.h>
#import <React/RCTSurfacePresenterBridgeAdapter.h>
#import <react/config/ReactNativeConfig.h>
#endif  // USE_FABRIC

NSObject *RNXInstallSurfacePresenterBridgeAdapter(RCTBridge *bridge)
{
#ifdef USE_FABRIC
    auto contextContainer = std::make_shared<facebook::react::ContextContainer const>();
    auto reactNativeConfig = std::make_shared<facebook::react::EmptyReactNativeConfig const>();
    contextContainer->insert("ReactNativeConfig", reactNativeConfig);

    auto bridgeAdapter = [[RCTSurfacePresenterBridgeAdapter alloc] initWithBridge:bridge
                                                                 contextContainer:contextContainer];
    bridge.surfacePresenter = bridgeAdapter.surfacePresenter;
    return bridgeAdapter;
#else
    return nil;
#endif  // USE_FABRIC
}

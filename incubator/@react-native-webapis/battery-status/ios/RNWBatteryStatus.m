#import "RNWBatteryStatus.h"

@implementation RNWBatteryStatus

RCT_EXPORT_MODULE(RNWBatteryStatus)

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

// clang-format off
RCT_EXPORT_METHOD(getStatus:(RCTPromiseResolveBlock)resolve
                   rejecter:(RCTPromiseRejectBlock)reject)
// clang-format on
{
    UIDevice *device = [UIDevice currentDevice];
    [device setBatteryMonitoringEnabled:YES];

    UIDeviceBatteryState batteryState = [device batteryState];
    BOOL isCharging = batteryState == UIDeviceBatteryStateCharging;
    NSDictionary *status = @{
        @"charging": [NSNumber numberWithBool:isCharging],
        @"chargingTime":
            [NSNumber numberWithFloat:batteryState == UIDeviceBatteryStateFull ? 0 : -1],
        @"dischargingTime": [NSNumber numberWithFloat:-1],
        @"level": [NSNumber numberWithFloat:[device batteryLevel]],
    };
    [device setBatteryMonitoringEnabled:NO];

    resolve(status);
}

@end

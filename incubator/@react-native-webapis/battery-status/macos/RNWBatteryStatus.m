#import "RNWBatteryStatus.h"

#import <IOKit/ps/IOPowerSources.h>

#define kBatteryStatusChargingKey @"charging"
#define kBatteryStatusChargingTimeKey @"chargingTime"
#define kBatteryStatusDischargingTimeKey @"dischargingTime"
#define kBatteryStatusLevelKey @"level"

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
    // These are values reported by Chrome/Edge on a desktop machine
    NSMutableDictionary *status =
        [NSMutableDictionary dictionaryWithObjectsAndKeys:@YES,
                                                          kBatteryStatusChargingKey,
                                                          @0,
                                                          kBatteryStatusChargingTimeKey,
                                                          @-1,
                                                          kBatteryStatusDischargingTimeKey,
                                                          @1,
                                                          kBatteryStatusLevelKey,
                                                          nil];

    CFTypeRef psInfo = IOPSCopyPowerSourcesInfo();
    if (psInfo != nil) {
        CFArrayRef psList = IOPSCopyPowerSourcesList(psInfo);
        if (CFArrayGetCount(psList) > 0) {
            CFTypeRef ps = CFArrayGetValueAtIndex(psList, 0);
            CFDictionaryRef desc = IOPSGetPowerSourceDescription(psInfo, ps);

            CFTypeRef state = CFDictionaryGetValue(desc, CFSTR(kIOPSPowerSourceStateKey));
            BOOL isPluggedIn =
                CFStringCompare(state, CFSTR(kIOPSACPowerValue), 0) == kCFCompareEqualTo;

            CFTypeRef charging = CFDictionaryGetValue(desc, CFSTR(kIOPSIsChargingKey));
            status[kBatteryStatusChargingKey] =
                [NSNumber numberWithBool:CFBooleanGetValue(charging)];

            CFTypeRef chargingTime = nil;
            if (isPluggedIn && CFDictionaryGetValueIfPresent(
                                   desc, CFSTR(kIOPSTimeToFullChargeKey), &chargingTime)) {
                int minutes = 0;
                CFNumberGetValue(chargingTime, kCFNumberIntType, &minutes);
                status[kBatteryStatusChargingTimeKey] =
                    [NSNumber numberWithInt:minutes < 0 ? minutes : minutes * 60];
            } else {
                status[kBatteryStatusChargingTimeKey] = @-1;
            }

            CFTypeRef dischargingTime = nil;
            if (!isPluggedIn &&
                CFDictionaryGetValueIfPresent(desc, CFSTR(kIOPSTimeToEmptyKey), &dischargingTime)) {
                int minutes = 0;
                CFNumberGetValue(dischargingTime, kCFNumberIntType, &minutes);
                status[kBatteryStatusDischargingTimeKey] =
                    [NSNumber numberWithInt:minutes < 0 ? minutes : minutes * 60];
            }

            CFTypeRef level = CFDictionaryGetValue(desc, CFSTR(kIOPSCurrentCapacityKey));
            int capacity = 0;
            CFNumberGetValue(level, kCFNumberIntType, &capacity);
            status[kBatteryStatusLevelKey] = [NSNumber numberWithFloat:capacity / 100.0];
        }

        CFRelease(psList);
        CFRelease(psInfo);
    }

    resolve(status);
}

@end

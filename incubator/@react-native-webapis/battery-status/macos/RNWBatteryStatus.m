#import "RNWBatteryStatus.h"

#import <IOKit/ps/IOPowerSources.h>

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
    NSMutableDictionary *status = [NSMutableDictionary dictionaryWithCapacity:4];

    CFTypeRef psInfo = IOPSCopyPowerSourcesInfo();
    if (psInfo != nil) {
        CFArrayRef psListRef = IOPSCopyPowerSourcesList(psInfo);
        if (CFArrayGetCount(psListRef) > 0) {
            CFTypeRef ps = CFArrayGetValueAtIndex(psListRef, 0);
            CFDictionaryRef desc = IOPSGetPowerSourceDescription(psInfo, ps);

            CFTypeRef state = CFDictionaryGetValue(desc, CFSTR(kIOPSPowerSourceStateKey));
            BOOL isPluggedIn = CFStringCompare(state, CFSTR(kIOPSACPowerValue), 0) == kCFCompareEqualTo;

            CFTypeRef charging = CFDictionaryGetValue(desc, CFSTR(kIOPSIsChargingKey));
            status[@"charging"] = [NSNumber numberWithBool:CFBooleanGetValue(charging)];

            CFTypeRef chargingTime = nil;
            if (isPluggedIn && CFDictionaryGetValueIfPresent(desc, CFSTR(kIOPSTimeToFullChargeKey), &chargingTime)) {
                int minutes = 0;
                CFNumberGetValue(chargingTime, kCFNumberIntType, &minutes);
                status[@"chargingTime"] = [NSNumber numberWithInt:minutes < 0 ? minutes : minutes * 60];
            } else {
                status[@"chargingTime"] = @-1;
            }

            CFTypeRef dischargingTime = nil;
            if (!isPluggedIn && CFDictionaryGetValueIfPresent(desc, CFSTR(kIOPSTimeToEmptyKey), &dischargingTime)) {
                int minutes = 0;
                CFNumberGetValue(dischargingTime, kCFNumberIntType, &minutes);
                status[@"dischargingTime"] = [NSNumber numberWithInt:minutes < 0 ? minutes : minutes * 60];
            } else {
                status[@"dischargingTime"] = @-1;
            }

            CFTypeRef level = CFDictionaryGetValue(desc, CFSTR(kIOPSCurrentCapacityKey));
            int capacity = 0;
            CFNumberGetValue(level, kCFNumberIntType, &capacity);
            status[@"level"] = [NSNumber numberWithFloat:capacity / 100.0];
        }

        CFRelease(psListRef);
        CFRelease(psInfo);
    }

    resolve(status);
}

@end

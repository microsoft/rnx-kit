#import "RNWWebStorage.h"

#import "RNWWebStorage+TurboModule.h"

@implementation RNWWebStorage

RCT_EXPORT_MODULE(RNWWebStorage)

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

- (NSString *)appDomain
{
    return [[NSBundle mainBundle] bundleIdentifier];
}

- (nullable NSDictionary<NSString *, id> *)dictionaryRepresentation
{
    return [[self userDefaults] persistentDomainForName:[self appDomain]];
}

- (NSUserDefaults *)userDefaults
{
    return [NSUserDefaults standardUserDefaults];
}

// clang-format off
RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSNumber *, length)
// clang-format on
{
    return [NSNumber numberWithUnsignedInteger:[[self dictionaryRepresentation] count]];
}

// clang-format off
RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSString *, key:(double)index)
// clang-format on
{
    // The order of the elements in `NSUserDefaults` is not defined.
    // https://developer.apple.com/documentation/foundation/nsuserdefaults/1415919-dictionaryrepresentation
    return nil;
}

// clang-format off
RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSString *, getItem:(NSString *)key)
// clang-format on
{
    return [[self userDefaults] stringForKey:key];
}

// clang-format off
RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSNumber *, setItem:(NSString *)key value:(NSString *)value)
// clang-format on
{
    [[self userDefaults] setObject:value forKey:key];
    return @NO;
}

// clang-format off
RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSNumber *, removeItem:(NSString *)key)
// clang-format on
{
    [[self userDefaults] removeObjectForKey:key];
    return @NO;
}

// clang-format off
RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSNumber *, clear)
// clang-format on
{
    [[self userDefaults] removePersistentDomainForName:[self appDomain]];
    return @NO;
}

#if RNW_USE_NEW_ARCH

- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeWebStorageSpecJSI>(params);
}

#endif  // RNW_USE_NEW_ARCH

@end

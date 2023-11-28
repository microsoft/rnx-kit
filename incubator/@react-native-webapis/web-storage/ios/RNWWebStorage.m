#import "RNWWebStorage.h"

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
RCT_EXPORT_SYNCHRONOUS_TYPED_METHOD(NSString *, key:(NSNumber *)index)
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
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(setItem:(NSString *)key value:(NSString *)value)
// clang-format on
{
    [[self userDefaults] setObject:value forKey:key];
    return nil;
}

// clang-format off
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(removeItem:(NSString *)key)
// clang-format on
{
    [[self userDefaults] removeObjectForKey:key];
    return nil;
}

// clang-format off
RCT_EXPORT_BLOCKING_SYNCHRONOUS_METHOD(clear)
// clang-format on
{
    [[self userDefaults] removePersistentDomainForName:[self appDomain]];
    return nil;
}

@end

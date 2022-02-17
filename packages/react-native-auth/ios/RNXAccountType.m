#import "RNXAccountType.h"

RNXAccountType RNXAccountTypeFromString(NSString *type)
{
    if ([type isEqualToString:@"Microsoft"]) {
        return RNXAccountTypeMicrosoftAccount;
    }
    if ([type isEqualToString:@"Organizational"]) {
        return RNXAccountTypeOrganizational;
    }

    NSCAssert(NO, @"Unknown account type: %@", type);
    return RNXAccountTypeInvalid;
}

#import "RNXAccountType.h"

RNXAccountType RNXAccountTypeFromString(NSString *type)
{
    if ([type isEqualToString:@"Organizational"]) {
        return RNXAccountTypeOrganizational;
    }
    return RNXAccountTypeMicrosoftAccount;
}

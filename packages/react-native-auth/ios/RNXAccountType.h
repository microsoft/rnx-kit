#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, RNXAccountType) {
    RNXAccountTypeMicrosoftAccount,
    RNXAccountTypeOrganizational,
    RNXAccountTypeCount
};

RNXAccountType RNXAccountTypeFromString(NSString *);

NS_ASSUME_NONNULL_END

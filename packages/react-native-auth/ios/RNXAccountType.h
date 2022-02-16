// TODO: This file will be generated from the TypeScript type definitions. For
// documentation, please go to
// https://github.com/microsoft/rnx-kit/blob/main/packages/react-native-auth/src/index.ts
// The codegen work is tracked in https://github.com/microsoft/rnx-kit/issues/1106

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, RNXAccountType) {
    RNXAccountTypeInvalid,
    RNXAccountTypeMicrosoftAccount,
    RNXAccountTypeOrganizational,
};

RNXAccountType RNXAccountTypeFromString(NSString *);

NS_ASSUME_NONNULL_END

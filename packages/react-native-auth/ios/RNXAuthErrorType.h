// TODO: This file will be generated from the TypeScript type definitions. For
// documentation, please go to
// https://github.com/microsoft/rnx-kit/blob/main/packages/react-native-auth/src/index.ts

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, RNXAuthErrorType) {
    RNXAuthErrorTypeUnknown,
    RNXAuthErrorTypeBadRefreshToken,
    RNXAuthErrorTypeConditionalAccessBlocked,
    RNXAuthErrorTypeInteractionRequired,
    RNXAuthErrorTypeNoResponse,
    RNXAuthErrorTypePreconditionViolated,
    RNXAuthErrorTypeServerDeclinedScopes,
    RNXAuthErrorTypeServerProtectionPoliciesRequired,
    RNXAuthErrorTypeTimeout,
    RNXAuthErrorTypeUserCanceled,
    RNXAuthErrorTypeWorkplaceJoinRequired,
    RNXAuthErrorTypeCount
};

NSString *RNXStringFromAuthErrorType(RNXAuthErrorType);

NS_ASSUME_NONNULL_END

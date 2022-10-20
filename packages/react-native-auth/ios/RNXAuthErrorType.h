// TODO: This file will be generated from the TypeScript type definitions. For
// documentation, please go to
// https://github.com/microsoft/rnx-kit/blob/main/packages/react-native-auth/src/index.ts
// The codegen work is tracked in https://github.com/microsoft/rnx-kit/issues/1106

#import <Foundation/Foundation.h>

NS_ASSUME_NONNULL_BEGIN

typedef NS_ENUM(NSInteger, RNXAuthErrorType) {
    RNXAuthErrorTypeUnknown,
    RNXAuthErrorTypeBadRefreshToken,
    RNXAuthErrorTypeConditionalAccessBlocked,
    RNXAuthErrorTypeInteractionRequired,
    RNXAuthErrorTypeNoResponse,
    RNXAuthErrorTypeNotImplemented,
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

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

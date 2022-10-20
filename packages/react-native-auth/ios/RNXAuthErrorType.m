#import "RNXAuthErrorType.h"

NSString *RNXStringFromAuthErrorType(RNXAuthErrorType type)
{
    switch (type) {
        case RNXAuthErrorTypeBadRefreshToken:
            return @"BadRefreshToken";
        case RNXAuthErrorTypeConditionalAccessBlocked:
            return @"ConditionalAccessBlocked";
        case RNXAuthErrorTypeInteractionRequired:
            return @"InteractionRequired";
        case RNXAuthErrorTypeNoResponse:
            return @"NoResponse";
        case RNXAuthErrorTypeNotImplemented:
            return @"NotImplemented";
        case RNXAuthErrorTypePreconditionViolated:
            return @"PreconditionViolated";
        case RNXAuthErrorTypeServerDeclinedScopes:
            return @"ServerDeclinedScopes";
        case RNXAuthErrorTypeServerProtectionPoliciesRequired:
            return @"ServerProtectionPoliciesRequired";
        case RNXAuthErrorTypeTimeout:
            return @"Timeout";
        case RNXAuthErrorTypeUserCanceled:
            return @"UserCanceled";
        case RNXAuthErrorTypeWorkplaceJoinRequired:
            return @"WorkplaceJoinRequired";
        default:
            return @"Unknown";
    }
}

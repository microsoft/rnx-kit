// TODO: This file will be generated from the TypeScript type definitions. For
// documentation, please go to
// https://github.com/microsoft/rnx-kit/blob/main/packages/react-native-auth/src/index.ts
// The codegen work is tracked in https://github.com/microsoft/rnx-kit/issues/1106

package com.microsoft.reactnativesdk.auth

enum class AuthErrorType(val type: String) {
    UNKNOWN("Unknown"),
    BAD_REFRESH_TOKEN("BadRefreshToken"),
    CONDITIONAL_ACCESS_BLOCKED("ConditionalAccessBlocked"),
    INTERACTION_REQUIRED("InteractionRequired"),
    NO_RESPONSE("NoResponse"),
    NOT_IMPLEMENTED("NotImplemented"),
    PRECONDITION_VIOLATED("PreconditionViolated"),
    SERVER_DECLINED_SCOPES("ServerDeclinedScopes"),
    SERVER_PROTECTION_POLICIES_REQUIRED("ServerProtectionPoliciesRequired"),
    TIMEOUT("Timeout"),
    USER_CANCELED("UserCanceled"),
    WORKPLACE_JOIN_REQUIRED("WorkplaceJoinRequired");
}

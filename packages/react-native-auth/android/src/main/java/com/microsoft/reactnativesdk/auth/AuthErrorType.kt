package com.microsoft.reactnativesdk.auth

enum class AuthErrorType(val type: String) {
    UNKNOWN("Unknown"),
    BAD_REFRESH_TOKEN("BadRefreshToken"),
    CONDITIONAL_ACCESS_BLOCKED("ConditionalAccessBlocked"),
    INTERACTION_REQUIRED("InteractionRequired"),
    NO_RESPONSE("NoResponse"),
    PRECONDITION_VIOLATED("PreconditionViolated"),
    SERVER_DECLINED_SCOPES("ServerDeclinedScopes"),
    SERVER_PROTECTION_POLICIES_REQUIRED("ServerProtectionPoliciesRequired"),
    TIMEOUT("Timeout"),
    USER_CANCELED("UserCanceled"),
    WORKPLACE_JOIN_REQUIRED("WorkplaceJoinRequired");
}

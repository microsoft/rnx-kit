package com.microsoft.reacttestapp.msal

import com.microsoft.identity.common.java.exception.BaseException
import com.microsoft.identity.common.java.exception.DeviceRegistrationRequiredException
import com.microsoft.identity.common.java.exception.IntuneAppProtectionPolicyRequiredException
import com.microsoft.identity.common.java.exception.ServiceException
import com.microsoft.identity.common.java.exception.UserCancelException

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

    companion object {
        fun fromMsalException(exception: BaseException?): AuthErrorType {
            // Try to map known exceptions found in
            // https://github.com/AzureAD/microsoft-authentication-library-common-for-android/tree/dev/common4j/src/main/com/microsoft/identity/common/java/exception
            return when (exception) {
                is DeviceRegistrationRequiredException -> WORKPLACE_JOIN_REQUIRED
                is IntuneAppProtectionPolicyRequiredException -> SERVER_PROTECTION_POLICIES_REQUIRED
                is ServiceException -> when (exception.errorCode) {
                    ServiceException.ACCESS_DENIED -> BAD_REFRESH_TOKEN
                    ServiceException.INVALID_SCOPE -> SERVER_DECLINED_SCOPES
                    ServiceException.REQUEST_TIMEOUT -> TIMEOUT
                    ServiceException.SERVICE_NOT_AVAILABLE -> NO_RESPONSE
                    else -> UNKNOWN
                }
                is UserCancelException -> USER_CANCELED
                else -> UNKNOWN
            }
        }
    }
}

package com.microsoft.reacttestapp.msal

import com.microsoft.identity.common.java.exception.BaseException

data class AuthError(
    val type: AuthErrorType,
    val correlationId: String,
    val message: String?
) {
    constructor(exception: BaseException) : this(
        AuthErrorType.fromMsalException(exception),
        exception.correlationId ?: TokenBroker.EMPTY_GUID,
        exception.message
    )
}

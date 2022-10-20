package com.microsoft.reacttestapp.msal

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.annotations.ReactModule
import com.microsoft.reactnativesdk.auth.OnTokenAcquired
import com.microsoft.reactnativesdk.auth.ReactNativeAuthModule

private typealias RnxAccountType = com.microsoft.reactnativesdk.auth.AccountType
private typealias RnxAuthError = com.microsoft.reactnativesdk.auth.AuthError
private typealias RnxAuthErrorType = com.microsoft.reactnativesdk.auth.AuthErrorType
private typealias RnxAuthResult = com.microsoft.reactnativesdk.auth.AuthResult

@ReactModule(name = ReactNativeAuthModule.NAME, hasConstants = false)
class ReactNativeAuthMSALModule(context: ReactApplicationContext?) :
    ReactNativeAuthModule(context) {

    override fun acquireTokenWithResource(
        resource: String,
        userPrincipalName: String,
        accountType: RnxAccountType,
        onTokenAcquired: OnTokenAcquired
    ) {
      onTokenAcquired(null, RnxAuthError.notImplemented())
    }

    override fun acquireTokenWithScopes(
        scopes: Array<String>,
        userPrincipalName: String,
        accountType: RnxAccountType,
        onTokenAcquired: OnTokenAcquired
    ) {
        val activity = reactApplicationContext.currentActivity
        if (activity == null) {
            onTokenAcquired(null, RnxAuthError.userCanceled())
            return
        }

        TokenBroker.getInstance(reactApplicationContext).acquireToken(
            activity,
            scopes,
            userPrincipalName,
            accountType.toAccountType()
        ) { result, error ->
            when {
                error != null -> onTokenAcquired(null, error.toRnxAuthError())
                result == null -> onTokenAcquired(null, RnxAuthError.unknown())
                else -> onTokenAcquired(result.toRnxAuthResult(), null)
            }
        }
    }
}

fun AuthError.toRnxAuthError(): RnxAuthError = RnxAuthError(
    type.toRnxAuthErrorType(),
    correlationId,
    message
)

fun AuthErrorType.toRnxAuthErrorType(): RnxAuthErrorType = when (this) {
    AuthErrorType.UNKNOWN -> RnxAuthErrorType.UNKNOWN
    AuthErrorType.BAD_REFRESH_TOKEN -> RnxAuthErrorType.BAD_REFRESH_TOKEN
    AuthErrorType.CONDITIONAL_ACCESS_BLOCKED -> RnxAuthErrorType.CONDITIONAL_ACCESS_BLOCKED
    AuthErrorType.INTERACTION_REQUIRED -> RnxAuthErrorType.INTERACTION_REQUIRED
    AuthErrorType.NO_RESPONSE -> RnxAuthErrorType.NO_RESPONSE
    AuthErrorType.PRECONDITION_VIOLATED -> RnxAuthErrorType.PRECONDITION_VIOLATED
    AuthErrorType.SERVER_DECLINED_SCOPES -> RnxAuthErrorType.SERVER_DECLINED_SCOPES
    AuthErrorType.SERVER_PROTECTION_POLICIES_REQUIRED -> RnxAuthErrorType.SERVER_PROTECTION_POLICIES_REQUIRED
    AuthErrorType.TIMEOUT -> RnxAuthErrorType.TIMEOUT
    AuthErrorType.USER_CANCELED -> RnxAuthErrorType.USER_CANCELED
    AuthErrorType.WORKPLACE_JOIN_REQUIRED -> RnxAuthErrorType.WORKPLACE_JOIN_REQUIRED
}

fun AuthResult.toRnxAuthResult(): RnxAuthResult = RnxAuthResult(
    accessToken,
    expirationTime,
    redirectUri
)

fun RnxAccountType.toAccountType(): AccountType = when (this) {
    RnxAccountType.INVALID -> AccountType.INVALID
    RnxAccountType.MICROSOFT_ACCOUNT -> AccountType.MICROSOFT_ACCOUNT
    RnxAccountType.ORGANIZATIONAL -> AccountType.ORGANIZATIONAL
}

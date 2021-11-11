package com.microsoft.reactnativesdk.auth

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

data class AuthError(
    val type: AuthErrorType,
    val correlationId: String,
    val message: String?
) {
    companion object {
        fun unknown() = AuthError(
            AuthErrorType.UNKNOWN,
            "00000000-0000-0000-0000-000000000000",
            null
        )

        fun userCanceled() = AuthError(
            AuthErrorType.USER_CANCELED,
            "00000000-0000-0000-0000-000000000000",
            null
        )
    }

    fun toWritableMap(): WritableMap {
        return Arguments.createMap().also { map ->
            map.putString("type", type.toString())
            map.putString("correlationId", correlationId)
            message?.let {
                map.putString("message", it)
            }
        }
    }
}

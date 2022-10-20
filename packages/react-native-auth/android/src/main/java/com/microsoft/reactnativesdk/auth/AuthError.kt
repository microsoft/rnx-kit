// TODO: This file will be generated from the TypeScript type definitions. For
// documentation, please go to
// https://github.com/microsoft/rnx-kit/blob/main/packages/react-native-auth/src/index.ts
// The codegen work is tracked in https://github.com/microsoft/rnx-kit/issues/1106

package com.microsoft.reactnativesdk.auth

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

data class AuthError(
    val type: AuthErrorType,
    val correlationId: String,
    val message: String? = null
) {
    companion object {
        fun notImplemented() = AuthError(
            AuthErrorType.NOT_IMPLEMENTED,
            "00000000-0000-0000-0000-000000000000"
        )

        fun unknown() = AuthError(
            AuthErrorType.UNKNOWN,
            "00000000-0000-0000-0000-000000000000"
        )

        fun userCanceled() = AuthError(
            AuthErrorType.USER_CANCELED,
            "00000000-0000-0000-0000-000000000000"
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

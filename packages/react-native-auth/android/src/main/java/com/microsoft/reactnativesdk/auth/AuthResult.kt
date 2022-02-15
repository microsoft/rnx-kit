// TODO: This file will be generated from the TypeScript type definitions. For
// documentation, please go to
// https://github.com/microsoft/rnx-kit/blob/main/packages/react-native-auth/src/index.ts

package com.microsoft.reactnativesdk.auth

import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableMap

data class AuthResult(
    val accessToken: String,
    val expirationTime: Int,
    val redirectUri: String
) {
    fun toWritableMap(): WritableMap {
        return Arguments.createMap().also { map ->
            map.putString("accessToken", accessToken)
            map.putInt("expirationTime", expirationTime)
            map.putString("redirectUri", redirectUri)
        }
    }
}

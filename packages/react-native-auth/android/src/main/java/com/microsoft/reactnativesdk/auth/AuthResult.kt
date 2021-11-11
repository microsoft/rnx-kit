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

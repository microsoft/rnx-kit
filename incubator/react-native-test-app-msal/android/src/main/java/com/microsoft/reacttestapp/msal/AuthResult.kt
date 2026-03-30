package com.microsoft.reacttestapp.msal

import com.microsoft.identity.client.IAuthenticationResult

data class AuthResult(
    val accessToken: String,
    val username: String,
    val expirationTime: Int,
    val redirectUri: String
) {
    constructor(result: IAuthenticationResult, redirectUri: String) : this(
        result.accessToken,
        result.account.username,
        (result.expiresOn.time / 1000).toInt(),
        redirectUri
    )
}

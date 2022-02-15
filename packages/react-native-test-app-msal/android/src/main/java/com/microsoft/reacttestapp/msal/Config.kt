package com.microsoft.reacttestapp.msal

import java.security.InvalidParameterException

class Config {
    companion object {
        val msaScopes: Array<String>
            get() = BuildConfig.ReactTestAppMSAL_msaScopes
        val orgScopes: Array<String>
            get() = BuildConfig.ReactTestAppMSAL_orgScopes

        fun authorityFor(accountType: AccountType): String = when (accountType) {
            AccountType.INVALID -> throw InvalidParameterException()
            AccountType.MICROSOFT_ACCOUNT -> "https://login.microsoftonline.com/consumers/oauth2/v2.0/authorize"
            AccountType.ORGANIZATIONAL -> "https://login.microsoftonline.com/common/"
        }

        fun scopesFor(accountType: AccountType): Array<String> = when (accountType) {
            AccountType.INVALID -> throw InvalidParameterException()
            AccountType.MICROSOFT_ACCOUNT -> msaScopes
            AccountType.ORGANIZATIONAL -> orgScopes
        }
    }
}

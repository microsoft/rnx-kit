package com.microsoft.reacttestapp.msal

class Config {
    companion object {
        val msaScopes: Array<String>
            get() = BuildConfig.ReactTestAppMSAL_msaScopes
        val orgScopes: Array<String>
            get() = BuildConfig.ReactTestAppMSAL_orgScopes

        fun scopesFor(accountType: AccountType): Array<String> = when (accountType) {
            AccountType.MICROSOFT_ACCOUNT -> msaScopes
            AccountType.ORGANIZATIONAL -> orgScopes
        }
    }
}

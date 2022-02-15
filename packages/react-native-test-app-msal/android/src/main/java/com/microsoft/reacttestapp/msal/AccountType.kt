package com.microsoft.reacttestapp.msal

import com.microsoft.identity.client.IAccount

enum class AccountType(val type: String) {
    INVALID("Invalid"),
    MICROSOFT_ACCOUNT("MicrosoftAccount"),
    ORGANIZATIONAL("Organizational");

    companion object {
        // Source: https://docs.microsoft.com/en-us/azure/active-directory/develop/id-tokens
        private const val MSA_TENANT = "9188040d-6c67-4c5b-b112-36a304b66dad"

        fun fromIssuer(issuer: String): AccountType {
            return if (issuer.contains(MSA_TENANT))
                MICROSOFT_ACCOUNT
            else
                ORGANIZATIONAL
        }
    }

    fun description(): String {
        return when (this) {
            INVALID -> "invalid"
            MICROSOFT_ACCOUNT -> "personal"
            ORGANIZATIONAL -> "work"
        }
    }
}

fun IAccount.accountType(): AccountType {
    return AccountType.fromIssuer(claims?.get("iss").toString())
}

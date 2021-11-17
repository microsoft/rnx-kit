package com.microsoft.reacttestapp.msal

import com.microsoft.identity.client.IAccount

enum class AccountType(val type: String) {
    MICROSOFT_ACCOUNT("MicrosoftAccount"),
    ORGANIZATIONAL("Organizational");

    companion object {
        fun fromIssuer(issuer: String): AccountType {
            return if (issuer.contains(TokenBroker.MSA_TENANT))
                MICROSOFT_ACCOUNT
            else
                ORGANIZATIONAL
        }
    }

    fun description(): String {
        return when (this) {
            MICROSOFT_ACCOUNT -> "personal"
            ORGANIZATIONAL -> "work"
        }
    }
}

fun IAccount.accountType(): AccountType {
    return AccountType.fromIssuer(claims?.get("iss").toString())
}

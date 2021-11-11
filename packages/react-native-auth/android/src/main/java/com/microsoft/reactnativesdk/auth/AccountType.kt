package com.microsoft.reactnativesdk.auth

enum class AccountType(val type: String) {
    MICROSOFT_ACCOUNT("MicrosoftAccount"),
    ORGANIZATIONAL("Organizational");

    companion object {
        fun from(string: String): AccountType {
            return when (string) {
                "MicrosoftAccount" -> MICROSOFT_ACCOUNT
                "Organizational" -> ORGANIZATIONAL
                else -> ORGANIZATIONAL
            }
        }
    }
}

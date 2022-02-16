// TODO: This file will be generated from the TypeScript type definitions. For
// documentation, please go to
// https://github.com/microsoft/rnx-kit/blob/main/packages/react-native-auth/src/index.ts
// The codegen work is tracked in https://github.com/microsoft/rnx-kit/issues/1106

package com.microsoft.reactnativesdk.auth

enum class AccountType(val type: String) {
    INVALID("Invalid"),
    MICROSOFT_ACCOUNT("MicrosoftAccount"),
    ORGANIZATIONAL("Organizational");

    companion object {
        fun from(string: String): AccountType {
            return when (string) {
                "MicrosoftAccount" -> MICROSOFT_ACCOUNT
                "Organizational" -> ORGANIZATIONAL
                else -> INVALID
            }
        }
    }
}

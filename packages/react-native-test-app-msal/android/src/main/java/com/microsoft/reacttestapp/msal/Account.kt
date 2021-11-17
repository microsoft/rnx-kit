package com.microsoft.reacttestapp.msal

import com.microsoft.identity.client.IAccount

data class Account(
    val userPrincipalName: String,
    val accountType: AccountType
) {
    override fun toString(): String {
        return "$userPrincipalName (${accountType.description()})"
    }
}

fun List<IAccount>.find(userPrincipalName: String, accountType: AccountType): IAccount? {
    return find {
        it.username == userPrincipalName && it.accountType() == accountType
    }
}

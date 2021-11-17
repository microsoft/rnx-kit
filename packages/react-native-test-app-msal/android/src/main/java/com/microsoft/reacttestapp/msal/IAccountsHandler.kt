package com.microsoft.reacttestapp.msal

interface IAccountsHandler {
    fun onAddAccount()
    fun onSignOut()
    fun onSignOutAllAccounts()
    fun onSwitchAccount(index: Int)
}

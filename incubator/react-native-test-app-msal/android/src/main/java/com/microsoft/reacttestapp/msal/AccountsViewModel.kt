package com.microsoft.reacttestapp.msal

import androidx.lifecycle.MutableLiveData
import androidx.lifecycle.ViewModel

class AccountsViewModel : ViewModel() {
    val accounts: MutableLiveData<List<Account>> by lazy {
        MutableLiveData<List<Account>>()
    }

    val canAddAccount: MutableLiveData<Boolean> by lazy {
        MutableLiveData<Boolean>(true)
    }

    val canSignOut: MutableLiveData<Boolean> by lazy {
        MutableLiveData<Boolean>(false)
    }

    val selectedAccount: MutableLiveData<Account> by lazy {
        MutableLiveData<Account>()
    }
}

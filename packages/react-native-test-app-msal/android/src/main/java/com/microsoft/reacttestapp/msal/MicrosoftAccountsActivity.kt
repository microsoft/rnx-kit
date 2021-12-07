package com.microsoft.reacttestapp.msal

import android.content.ClipData
import android.content.ClipboardManager
import android.os.Bundle
import android.widget.AdapterView
import android.widget.AutoCompleteTextView
import android.widget.Button
import android.widget.TextView
import androidx.activity.viewModels
import androidx.annotation.StringRes
import androidx.appcompat.app.AppCompatActivity
import androidx.core.content.edit
import androidx.lifecycle.Observer
import com.google.android.material.dialog.MaterialAlertDialogBuilder
import com.google.android.material.snackbar.Snackbar
import com.google.android.material.textfield.TextInputLayout
import java.util.concurrent.ExecutorService
import java.util.concurrent.Executors

@Suppress("unused")
class MicrosoftAccountsActivity : AppCompatActivity() {
    companion object {
        private const val ACCOUNT_TYPE_KEY = "selected_account_type"
        private const val USERNAME_KEY = "selected_user_principal_name"
    }

    private val accounts: MutableList<Account> = mutableListOf()

    private val accountsDropdown: TextInputLayout by lazy {
        findViewById(R.id.accounts_dropdown)
    }

    private val executorService: ExecutorService by lazy {
        Executors.newSingleThreadExecutor()
    }

    private val viewModel: AccountsViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.microsoft_accounts)

        val accountsAdapter = AccountsAdapter(this, accounts)
        (accountsDropdown.editText as? AutoCompleteTextView)?.apply {
            onItemClickListener = AdapterView.OnItemClickListener { _, _, position, _ ->
                onAccountSelected(position)
            }
            setAdapter(accountsAdapter)
        }

        findViewById<Button>(R.id.add_account).apply {
            setOnClickListener { onAddAccount() }

            val canAddAccountObserver = Observer<Boolean> { isEnabled = it }
            viewModel.canAddAccount.observe(this@MicrosoftAccountsActivity, canAddAccountObserver)
        }

        findViewById<Button>(R.id.sign_out).apply {
            setOnClickListener { onSignOut() }

            val canSignOutObserver = Observer<Boolean> { isEnabled = it }
            viewModel.canSignOut.observe(this@MicrosoftAccountsActivity, canSignOutObserver)
        }

        val signOutAllButton = findViewById<Button>(R.id.sign_out_all)
        signOutAllButton.setOnClickListener { onSignOutAllAccounts() }

        val accountsObserver = Observer<List<Account>> { accounts ->
            accountsAdapter.notifyDataSetChanged()
            accountsDropdown.isEnabled = accounts.isNotEmpty()
            signOutAllButton.isEnabled = accounts.size > 1
        }
        viewModel.accounts.observe(this, accountsObserver)

        val sharedPreferences = getPreferences(MODE_PRIVATE)

        val selectedAccountObserver = Observer<Account> { account ->
            withTokenBroker { tokenBroker ->
                if (tokenBroker.selectedAccount == account) {
                    return@withTokenBroker
                }

                tokenBroker.selectedAccount = account

                when (account) {
                    null -> sharedPreferences.edit {
                        remove(USERNAME_KEY)
                        remove(ACCOUNT_TYPE_KEY)
                    }
                    else -> sharedPreferences.edit {
                        putString(USERNAME_KEY, account.userPrincipalName)
                        putString(ACCOUNT_TYPE_KEY, account.accountType.toString())
                    }
                }
            }

            when (account) {
                null -> {
                    accountsDropdown.editText?.text?.clear()
                    viewModel.canSignOut.value = false
                }
                else -> {
                    accountsDropdown.editText?.let {
                        if (it.text?.length == 0) {
                            it.setText(account.toString(), TextView.BufferType.EDITABLE)
                        }
                    }
                    viewModel.canSignOut.value = true
                }
            }
        }
        viewModel.selectedAccount.observe(this, selectedAccountObserver)

        withTokenBroker { tokenBroker ->
            val allAccounts = tokenBroker.allAccounts()
            if (allAccounts.isNotEmpty()) {
                accounts.addAll(allAccounts)
                viewModel.accounts.postValue(accounts)

                val userPrincipalName = sharedPreferences.getString(USERNAME_KEY, null)
                val accountType = sharedPreferences.getString(ACCOUNT_TYPE_KEY, null)
                val selectedAccount = allAccounts.find {
                    it.userPrincipalName == userPrincipalName && it.accountType.toString() == accountType
                }
                tokenBroker.selectedAccount = selectedAccount
                viewModel.selectedAccount.postValue(selectedAccount)
            }
        }
    }

    private fun addAccount(accountType: AccountType) {
        viewModel.canAddAccount.value = false

        withTokenBroker { tokenBroker ->
            tokenBroker.acquireToken(
                this,
                Config.scopesFor(accountType),
                null,
                accountType
            ) { result: AuthResult?, error: AuthError? ->
                viewModel.canAddAccount.postValue(true)

                when {
                    error != null -> when (error.type) {
                        AuthErrorType.USER_CANCELED -> return@acquireToken
                        else -> {
                            val message =
                                error.message ?: resources.getString(R.string.error_sign_in)
                            showAlertDialog(R.string.error_sign_in, message)
                        }
                    }
                    result == null -> showErrorMessage(R.string.error_sign_in)
                    else -> withTokenBroker { tokenBroker ->
                        val allAccounts = tokenBroker.allAccounts()

                        accounts.clear()
                        accounts.addAll(allAccounts)
                        viewModel.accounts.postValue(accounts)

                        val selectedAccount = allAccounts.findLast {
                            it.accountType == accountType && it.userPrincipalName == result.username
                        }
                        viewModel.selectedAccount.postValue(selectedAccount)
                    }
                }
            }
        }
    }

    private fun onAccountSelected(index: Int) {
        val account = accounts[index]
        viewModel.selectedAccount.value = account

        val scopes = Config.scopesFor(account.accountType)
        if (scopes.isNotEmpty()) {
            withTokenBroker { tokenBroker ->
                tokenBroker.acquireToken(
                    this,
                    scopes,
                    account.userPrincipalName,
                    account.accountType
                ) { result: AuthResult?, error: AuthError? ->
                    when {
                        error != null -> showErrorMessage(
                            error.message ?: resources.getString(R.string.error_refresh)
                        )
                        result == null -> showErrorMessage(R.string.error_refresh)
                    }
                }
            }
        }
    }

    private fun onAddAccount() {
        MaterialAlertDialogBuilder(this)
            .setTitle(R.string.select_account_type)
            .setNegativeButton(R.string.account_type_personal) { _, _ ->
                addAccount(AccountType.MICROSOFT_ACCOUNT)
            }
            .setPositiveButton(R.string.account_type_work) { _, _ ->
                addAccount(AccountType.ORGANIZATIONAL)
            }
            .setCancelable(true)
            .show()
    }

    private fun onSignOut() {
        viewModel.canSignOut.value = false

        withTokenBroker { tokenBroker ->
            tokenBroker.signOut { account, exception ->
                when (exception) {
                    null -> {
                        val index = accounts.indexOf(account)
                        if (index >= 0) {
                            accounts.removeAt(index)
                        }
                        viewModel.accounts.postValue(accounts)
                        viewModel.selectedAccount.postValue(null)
                    }
                    else -> {
                        viewModel.canSignOut.postValue(true)
                        showErrorMessage(R.string.error_sign_out)
                    }
                }
            }
        }
    }

    private fun onSignOutAllAccounts() {
        accounts.clear()
        viewModel.accounts.value = accounts
        viewModel.selectedAccount.value = null

        withTokenBroker { tokenBroker ->
            tokenBroker.removeAllAccounts()
        }
    }

    private fun showAlertDialog(@StringRes title: Int, message: String) {
        MaterialAlertDialogBuilder(this)
            .setTitle(title)
            .setMessage(message)
            .setNeutralButton(R.string.copy) { _, _ ->
                val clipboard = getSystemService(CLIPBOARD_SERVICE) as ClipboardManager
                val label = resources.getString(R.string.auth_error_message)
                clipboard.setPrimaryClip(ClipData.newPlainText(label, message))
            }
            .setPositiveButton(R.string.ok, null)
            .show()
    }

    private fun showErrorMessage(message: String) {
        Snackbar.make(accountsDropdown, message, Snackbar.LENGTH_LONG).show()
    }

    private fun showErrorMessage(@StringRes resId: Int) {
        Snackbar.make(accountsDropdown, resId, Snackbar.LENGTH_LONG).show()
    }

    private fun withTokenBroker(execute: (tokenBroker: TokenBroker) -> Unit) {
        executorService.execute {
            try {
                execute(TokenBroker.getInstance(this))
            } catch (e: Exception) {
                showErrorMessage(e.message ?: "Unknown error")
            }
        }
    }
}

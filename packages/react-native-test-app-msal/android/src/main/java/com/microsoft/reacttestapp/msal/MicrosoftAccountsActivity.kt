package com.microsoft.reacttestapp.msal

import android.content.ClipData
import android.content.ClipboardManager
import android.content.SharedPreferences
import android.os.Bundle
import android.widget.AdapterView
import android.widget.AutoCompleteTextView
import android.widget.Button
import android.widget.TextView
import androidx.annotation.StringRes
import androidx.appcompat.app.AppCompatActivity
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

    private val accountsAdapter: AccountsAdapter by lazy {
        AccountsAdapter(this, accounts)
    }

    private val accountsDropdown: TextInputLayout by lazy {
        findViewById(R.id.accounts_dropdown)
    }

    private val addAccountButton: Button by lazy {
        findViewById(R.id.add_account)
    }

    private val executorService: ExecutorService by lazy {
        Executors.newSingleThreadExecutor()
    }

    private val sharedPreferences: SharedPreferences by lazy {
        getPreferences(MODE_PRIVATE)
    }

    private val signOutButton: Button by lazy {
        findViewById(R.id.sign_out)
    }

    private val signOutAllButton: Button by lazy {
        findViewById(R.id.sign_out_all)
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        setContentView(R.layout.microsoft_accounts)

        (accountsDropdown.editText as? AutoCompleteTextView)?.apply {
            onItemClickListener = AdapterView.OnItemClickListener { _, _, position, _ ->
                onAccountSelected(position)
            }
            setAdapter(accountsAdapter)
        }
        addAccountButton.setOnClickListener { onAddAccount() }
        signOutButton.setOnClickListener { onSignOut() }
        signOutAllButton.setOnClickListener { onSignOutAllAccounts() }

        withTokenBroker { tokenBroker ->
            val allAccounts = tokenBroker.allAccounts()
            if (allAccounts.isNotEmpty()) {
                accounts.addAll(allAccounts)
                accountsAdapter.notifyDataSetChanged()

                val userPrincipalName = sharedPreferences.getString(USERNAME_KEY, null)
                val accountType = sharedPreferences.getString(ACCOUNT_TYPE_KEY, null)
                val selectedAccount = allAccounts.find {
                    it.userPrincipalName == userPrincipalName && it.accountType.toString() == accountType
                }
                setSelectedAccount(tokenBroker, selectedAccount, false)
            }
        }
    }

    private fun addAccount(accountType: AccountType) {
        addAccountButton.isEnabled = false

        withTokenBroker { tokenBroker ->
            tokenBroker.acquireToken(
                this,
                Config.scopesFor(accountType),
                null,
                accountType
            ) { result: AuthResult?, error: AuthError? ->
                runOnUiThread {
                    addAccountButton.isEnabled = true
                }

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
                        accountsAdapter.notifyDataSetChanged()

                        val selectedAccount = allAccounts.findLast {
                            it.accountType == accountType && it.userPrincipalName == result.username
                        }
                        setSelectedAccount(tokenBroker, selectedAccount)
                    }
                }
            }
        }
    }

    private fun onAccountSelected(index: Int) {
        withTokenBroker { tokenBroker ->
            val account = accounts[index]
            setSelectedAccount(tokenBroker, account)

            val scopes = Config.scopesFor(account.accountType)
            if (scopes.isNotEmpty()) {
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
        signOutButton.isEnabled = false

        withTokenBroker { tokenBroker ->
            tokenBroker.signOut { exception ->
                when (exception) {
                    null -> {
                        val index = accounts.indexOf(tokenBroker.selectedAccount)
                        accounts.removeAt(index)
                        accountsAdapter.notifyDataSetChanged()

                        withTokenBroker { tokenBroker ->
                            setSelectedAccount(tokenBroker, null)
                        }
                    }
                    else -> showErrorMessage(R.string.error_sign_out)
                }
            }
        }
    }

    private fun onSignOutAllAccounts() {
        accountsDropdown.editText?.text?.clear()
        accountsDropdown.isEnabled = false
        signOutButton.isEnabled = false
        signOutAllButton.isEnabled = false

        withTokenBroker { tokenBroker ->
            tokenBroker.removeAllAccounts()
            accounts.clear()
            accountsAdapter.notifyDataSetChanged()
            setSelectedAccount(tokenBroker, null)
        }
    }

    private fun setSelectedAccount(
        tokenBroker: TokenBroker,
        account: Account?,
        updatePreferences: Boolean = true
    ) {
        tokenBroker.selectedAccount = account

        runOnUiThread {
            if (account == null) {
                accountsDropdown.editText?.text?.clear()
                signOutButton.isEnabled = false
            } else {
                accountsDropdown.editText?.let {
                    if (it.text?.length == 0) {
                        it.setText(account.toString(), TextView.BufferType.EDITABLE)
                    }
                }
                signOutButton.isEnabled = true
            }
            accountsDropdown.isEnabled = accounts.isNotEmpty()
            signOutAllButton.isEnabled = accounts.size > 1
        }

        if (updatePreferences) {
            when (account) {
                null -> sharedPreferences.edit()
                    .remove(USERNAME_KEY)
                    .remove(ACCOUNT_TYPE_KEY)
                    .apply()
                else -> sharedPreferences.edit()
                    .putString(USERNAME_KEY, account.userPrincipalName)
                    .putString(ACCOUNT_TYPE_KEY, account.accountType.toString())
                    .apply()
            }
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

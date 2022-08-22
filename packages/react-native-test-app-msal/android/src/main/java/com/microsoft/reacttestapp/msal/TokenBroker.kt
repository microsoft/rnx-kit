package com.microsoft.reacttestapp.msal

import android.app.Activity
import android.content.Context
import android.content.res.Resources.NotFoundException
import com.microsoft.identity.client.AcquireTokenParameters
import com.microsoft.identity.client.AuthenticationCallback
import com.microsoft.identity.client.IAuthenticationResult
import com.microsoft.identity.client.IMultipleAccountPublicClientApplication
import com.microsoft.identity.client.PublicClientApplication
import com.microsoft.identity.client.exception.MsalException
import com.microsoft.identity.common.java.exception.BaseException
import com.microsoft.identity.common.java.exception.UiRequiredException

typealias TokenAcquiredHandler = (result: AuthResult?, error: AuthError?) -> Unit

class TokenBroker private constructor(context: Context) {
    companion object {
        const val EMPTY_GUID = "00000000-0000-0000-0000-000000000000"

        @Volatile
        private var INSTANCE: TokenBroker? = null

        fun getInstance(context: Context): TokenBroker =
            INSTANCE ?: synchronized(this) {
                INSTANCE ?: TokenBroker(context).also {
                    INSTANCE = it
                }
            }
    }

    var selectedAccount: Account? = null

    private var multiAccountApp: IMultipleAccountPublicClientApplication

    init {
        val configFileResourceId = context.resources
            .getIdentifier("raw/msal_config", null, context.packageName)
        if (configFileResourceId == 0) {
            throw NotFoundException("Can't find MSAL configuration file")
        }
        multiAccountApp = PublicClientApplication.createMultipleAccountPublicClientApplication(
            context,
            configFileResourceId
        )
    }

    fun acquireToken(
        activity: Activity,
        scopes: Array<String>,
        userPrincipalName: String?,
        accountType: AccountType,
        onTokenAcquired: TokenAcquiredHandler
    ) {
        acquireTokenSilent(
            activity,
            scopes,
            userPrincipalName,
            accountType,
            onTokenAcquired
        )
    }

    fun allAccounts(): List<Account> = multiAccountApp.accounts.map {
        Account(it.username, it.accountType())
    }

    fun removeAllAccounts() {
        selectedAccount = null
        multiAccountApp.accounts.forEach {
            multiAccountApp.removeAccount(it)
        }
    }

    fun signOut(onCompleted: (account: Account?, exception: Exception?) -> Unit) {
        val account = selectedAccount?.let {
            multiAccountApp.accounts.find(it.userPrincipalName, it.accountType)
        }
        when (account) {
            null -> {
                onCompleted(selectedAccount, null)
                selectedAccount = null
            }
            else -> multiAccountApp.removeAccount(
                account,
                object : IMultipleAccountPublicClientApplication.RemoveAccountCallback {
                    override fun onRemoved() {
                        onCompleted(selectedAccount, null)
                        selectedAccount = null
                    }

                    override fun onError(exception: MsalException) {
                        onCompleted(selectedAccount, exception)
                    }
                }
            )
        }
    }

    private fun acquireTokenInteractive(
        activity: Activity,
        scopes: Array<String>,
        userPrincipalName: String?,
        accountType: AccountType,
        onTokenAcquired: TokenAcquiredHandler
    ) {
        val parameters = AcquireTokenParameters.Builder()
            .startAuthorizationFromActivity(activity)
            .withScopes(scopes.toMutableList())
            .fromAuthority(Config.authorityFor(accountType))
            .withCallback(object : AuthenticationCallback {
                override fun onSuccess(result: IAuthenticationResult) {
                    val redirectUri = multiAccountApp.configuration.redirectUri
                    onTokenAcquired(AuthResult(result, redirectUri), null)
                }

                override fun onError(exception: MsalException) {
                    onTokenAcquired(null, AuthError(exception))
                }

                override fun onCancel() {
                    onTokenAcquired(
                        null,
                        AuthError(AuthErrorType.USER_CANCELED, EMPTY_GUID, null)
                    )
                }
            })
        userPrincipalName?.let { parameters.withLoginHint(it) }
        multiAccountApp.acquireToken(parameters.build())
    }

    private fun acquireTokenSilent(
        activity: Activity,
        scopes: Array<String>,
        userPrincipalName: String?,
        accountType: AccountType,
        onTokenAcquired: TokenAcquiredHandler
    ) {
        val account = userPrincipalName?.let {
            multiAccountApp.accounts.find(userPrincipalName, accountType)
        }
        if (account == null) {
            acquireTokenInteractive(
                activity,
                scopes,
                userPrincipalName,
                accountType,
                onTokenAcquired
            )
            return
        }

        val authority = multiAccountApp.configuration.defaultAuthority.authorityURL.toString()
        try {
            val result = multiAccountApp.acquireTokenSilent(scopes, account, authority)
            val redirectUri = multiAccountApp.configuration.redirectUri
            onTokenAcquired(AuthResult(result, redirectUri), null)
        } catch (_: UiRequiredException) {
            acquireTokenInteractive(
                activity,
                scopes,
                userPrincipalName,
                accountType,
                onTokenAcquired
            )
        } catch (exception: BaseException) {
            onTokenAcquired(null, AuthError(exception))
        }
    }
}

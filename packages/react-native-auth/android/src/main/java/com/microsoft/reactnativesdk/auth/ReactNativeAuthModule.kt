package com.microsoft.reactnativesdk.auth

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReactModuleWithSpec
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.module.model.ReactModuleInfo

typealias OnTokenAcquired = (result: AuthResult?, error: AuthError?) -> Unit

/**
 * A partial implementation of the RNXAuth native module. Implementers of this
 * module must implement all public methods, and register itself as `RNXAuth`.
 *
 * An example implementation can be found in `react-native-test-app-msal`:
 *
 * ```kotlin
 * // android/src/rnx/java/com/microsoft/reacttestapp/msal/ReactNativeAuthMSALModule.kt
 * @ReactModule(name = ReactNativeAuthModule.NAME, hasConstants = false)
 * class ReactNativeAuthMSALModule(context: ReactApplicationContext?) : ReactNativeAuthModule(context) {
 *     override fun acquireTokenWithScopes(
 *         scopes: Array<String>,
 *         userPrincipalName: String,
 *         accountType: RnxAccountType,
 *         onTokenAcquired: OnTokenAcquired
 *     ) {
 *         TODO("Implement me!")
 *     }
 * }
 * ```
 */
abstract class ReactNativeAuthModule(context: ReactApplicationContext?) :
    ReactContextBaseJavaModule(context), ReactModuleWithSpec {

    companion object {
        const val NAME = "RNXAuth"

        fun <T> moduleInfo(klass: Class<T>): ReactModuleInfo = ReactModuleInfo(
            NAME,
            klass.name,
            false,
            false,
            false,
            false,
            false
        )
    }

    abstract fun acquireTokenWithResource(
        resource: String,
        userPrincipalName: String,
        accountType: AccountType,
        onTokenAcquired: OnTokenAcquired
    )

    abstract fun acquireTokenWithScopes(
        scopes: Array<String>,
        userPrincipalName: String,
        accountType: AccountType,
        onTokenAcquired: OnTokenAcquired
    )

    override fun getName(): String = NAME

    @ReactMethod
    fun acquireTokenWithResource(
        resource: String,
        userPrincipalName: String,
        accountType: String,
        promise: Promise
    ) {
        acquireTokenWithResource(
            resource,
            userPrincipalName,
            AccountType.from(accountType)
        ) { result, error ->
            when {
                error != null -> promise.reject(error.type.toString(), error.toWritableMap())
                result == null -> promise.reject(
                    AuthErrorType.UNKNOWN.toString(),
                    AuthError.unknown().toWritableMap()
                )
                else -> promise.resolve(result.toWritableMap())
            }
        }
    }

    @ReactMethod
    fun acquireTokenWithScopes(
        scopes: ReadableArray,
        userPrincipalName: String,
        accountType: String,
        promise: Promise
    ) {
        acquireTokenWithScopes(
            scopes.toStringArray(),
            userPrincipalName,
            AccountType.from(accountType)
        ) { result, error ->
            when {
                error != null -> promise.reject(error.type.toString(), error.toWritableMap())
                result == null -> promise.reject(
                    AuthErrorType.UNKNOWN.toString(),
                    AuthError.unknown().toWritableMap()
                )
                else -> promise.resolve(result.toWritableMap())
            }
        }
    }
}

fun ReadableArray.toStringArray(): Array<String> {
    val strings = mutableListOf<String>().apply {
        for (i in 0 until size()) {
            add(getString(i))
        }
    }
    return strings.toTypedArray()
}

package com.microsoft.reacttestapp.msal

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.microsoft.reactnativesdk.auth.ReactNativeAuthModule

class ReactNativeAuthModuleProvider {
    companion object {
        fun create(reactContext: ReactApplicationContext?): ReactNativeAuthModule? = null
        fun info(): ReactModuleInfo? = null
    }
}

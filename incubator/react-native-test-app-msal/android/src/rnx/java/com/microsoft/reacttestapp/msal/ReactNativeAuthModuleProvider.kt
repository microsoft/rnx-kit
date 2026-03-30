package com.microsoft.reacttestapp.msal

import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.microsoft.reactnativesdk.auth.ReactNativeAuthModule

class ReactNativeAuthModuleProvider {
    companion object {
        @Suppress("RedundantNullableReturnType")
        fun create(reactContext: ReactApplicationContext?): ReactNativeAuthModule? =
            ReactNativeAuthMSALModule(reactContext)

        @Suppress("RedundantNullableReturnType")
        fun info(): ReactModuleInfo? =
            ReactNativeAuthModule.moduleInfo(ReactNativeAuthMSALModule::class.java)
    }
}

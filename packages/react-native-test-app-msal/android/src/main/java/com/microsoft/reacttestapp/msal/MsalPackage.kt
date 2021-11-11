package com.microsoft.reacttestapp.msal

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfoProvider

class MsalPackage : TurboReactPackage() {
    override fun getModule(name: String?, reactContext: ReactApplicationContext?): NativeModule {
        val info = ReactNativeAuthModuleProvider.info()
            ?: throw IllegalArgumentException("No modules were ever registered")

        return when (name) {
            info.name() -> ReactNativeAuthModuleProvider.create(reactContext)
                ?: throw IllegalStateException("ReactNativeAuthModuleProvider.create() wasn't supposed to return null")
            else -> throw IllegalArgumentException("No module named '$name'")
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            val info = ReactNativeAuthModuleProvider.info()
            if (info == null)
                mapOf()
            else
                mapOf(info.name() to info).toMutableMap()
        }
}

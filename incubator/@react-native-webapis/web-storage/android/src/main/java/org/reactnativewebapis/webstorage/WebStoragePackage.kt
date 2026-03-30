package org.reactnativewebapis.webstorage

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class WebStoragePackage : BaseReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule =
        when (name) {
            WebStorageModule.NAME -> WebStorageModule(reactContext)
            else -> throw IllegalArgumentException("No module named '$name'")
        }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        val info = ReactModuleInfo(
            WebStorageModule.NAME,
            WebStorageModule::class.java.name,
            false,
            false,
            false,
            WebStorageModule.IS_TURBO_MODULE
        )
        mapOf(WebStorageModule.NAME to info).toMutableMap()
    }
}

package org.reactnativewebapis.webstorage

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class WebStoragePackage : TurboReactPackage() {
    override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule {
        return when (name) {
            WebStorageModule.NAME -> WebStorageModule(reactContext)
            else -> throw IllegalArgumentException("No module named '$name'")
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider = ReactModuleInfoProvider {
        val info = ReactModuleInfo(
            WebStorageModule.NAME,
            WebStorageModule::class.java.name,
            false,
            false,
            false,
            false,
            WebStorageModule.IS_TURBO_MODULE
        )
        mapOf(info.name() to info).toMutableMap()
    }
}

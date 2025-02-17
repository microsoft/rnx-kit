package org.reactnativewebapis.batterystatus

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class BatteryStatusPackage : BaseReactPackage() {
    override fun getModule(name: String?, reactContext: ReactApplicationContext?): NativeModule =
        when (name) {
            BatteryStatusModule.NAME -> BatteryStatusModule(reactContext)
            else -> throw IllegalArgumentException("No module named '$name'")
        }

    override fun getReactModuleInfoProvider() = ReactModuleInfoProvider {
        val info = ReactModuleInfo(
            BatteryStatusModule.NAME,
            BatteryStatusModule::class.java.name,
            false,
            false,
            false,
            false
        )
        mapOf(BatteryStatusModule.NAME to info).toMutableMap()
    }
}

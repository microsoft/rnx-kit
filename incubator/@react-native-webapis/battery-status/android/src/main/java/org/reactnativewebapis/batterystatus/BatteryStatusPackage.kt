package org.reactnativewebapis.batterystatus

import com.facebook.react.TurboReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class BatteryStatusPackage : TurboReactPackage() {
    override fun getModule(name: String?, reactContext: ReactApplicationContext?): NativeModule {
        return when (name) {
            BatteryStatusModule.NAME -> BatteryStatusModule(reactContext)
            else -> throw IllegalArgumentException("No module named '$name'")
        }
    }

    override fun getReactModuleInfoProvider(): ReactModuleInfoProvider =
        ReactModuleInfoProvider {
            val info = ReactModuleInfo(
                BatteryStatusModule.NAME,
                BatteryStatusModule::class.java.name,
                false,
                false,
                false,
                false,
                false
            )
            mapOf(info.name() to info).toMutableMap()
        }
}

package org.reactnativewebapis.batterystatus

import android.content.Context
import android.os.BatteryManager
import android.os.Build
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReactModuleWithSpec

class BatteryStatusModule(context: ReactApplicationContext?) :
    ReactContextBaseJavaModule(context), ReactModuleWithSpec {

    companion object {
        const val NAME = "RNWBatteryStatus"
    }

    override fun getName(): String = NAME

    @ReactMethod
    fun getStatus(promise: Promise) {
        val batteryManager =
            reactApplicationContext.getSystemService(Context.BATTERY_SERVICE) as BatteryManager
        promise.resolve(
            Arguments.createMap().also { map ->
                map.putBoolean("charging", batteryManager.isCharging)
                map.putInt("chargingTime", batteryManager.getChargingTime())
                map.putInt("dischargingTime", -1)
                map.putDouble("level", batteryManager.getBatteryLevel())
            }
        )
    }
}

fun BatteryManager.getBatteryLevel(): Double {
    return getIntProperty(BatteryManager.BATTERY_PROPERTY_CAPACITY) / 100.0
}

fun BatteryManager.getChargingTime(): Int {
    return if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        (computeChargeTimeRemaining() / 1000).toInt()
    } else {
        -1
    }
}

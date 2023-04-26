package com.microsoft.reactnativehost.compat

import android.app.Application
import com.facebook.react.ReactNativeHost
import com.microsoft.reactnativehost.turbomodule.TurboModuleManagerDelegate

abstract class ReactNativeHostCompat(application: Application) : ReactNativeHost(application) {
    override fun getReactPackageTurboModuleManagerDelegateBuilder() =
        TurboModuleManagerDelegate.Builder()
}

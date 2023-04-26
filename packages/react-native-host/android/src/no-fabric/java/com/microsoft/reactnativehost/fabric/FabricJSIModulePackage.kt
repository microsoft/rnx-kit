package com.microsoft.reactnativehost.fabric

import com.facebook.react.ReactNativeHost
import com.facebook.react.bridge.JSIModule
import com.facebook.react.bridge.JSIModulePackage
import com.facebook.react.bridge.JSIModuleSpec
import com.facebook.react.bridge.JavaScriptContextHolder
import com.facebook.react.bridge.ReactApplicationContext

@Suppress("UNUSED_PARAMETER")
class FabricJSIModulePackage(reactNativeHost: ReactNativeHost) : JSIModulePackage {
    override fun getJSIModules(
        reactApplicationContext: ReactApplicationContext,
        jsContext: JavaScriptContextHolder?
    ): ArrayList<JSIModuleSpec<JSIModule>> {
        return arrayListOf()
    }
}

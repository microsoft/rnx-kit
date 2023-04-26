package com.microsoft.reactnativehost.fabric

import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.bridge.JSIModulePackage
import com.facebook.react.bridge.JSIModuleProvider
import com.facebook.react.bridge.JSIModuleSpec
import com.facebook.react.bridge.JSIModuleType
import com.facebook.react.bridge.JavaScriptContextHolder
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.UIManager
import com.facebook.react.fabric.ComponentFactory
import com.facebook.react.fabric.CoreComponentsRegistry
import com.facebook.react.fabric.EmptyReactNativeConfig
import com.facebook.react.fabric.FabricJSIModuleProvider
import com.facebook.react.uimanager.ViewManagerRegistry
import java.lang.ref.WeakReference

class FabricJSIModulePackage(reactNativeHost: ReactNativeHost) : JSIModulePackage {

    private val reactInstanceManager: ReactInstanceManager?
        get() = reactNativeHost.get()?.reactInstanceManager

    private val reactNativeHost: WeakReference<ReactNativeHost> = WeakReference(reactNativeHost)

    override fun getJSIModules(
        reactApplicationContext: ReactApplicationContext,
        jsContext: JavaScriptContextHolder?
    ): ArrayList<JSIModuleSpec<*>> {
        return arrayListOf(object : JSIModuleSpec<UIManager?> {
            override fun getJSIModuleType(): JSIModuleType = JSIModuleType.UIManager

            override fun getJSIModuleProvider(): JSIModuleProvider<UIManager?> {
                val componentFactory = ComponentFactory()
                CoreComponentsRegistry.register(componentFactory)

                ComponentsRegistry.register(componentFactory)

                return FabricJSIModuleProvider(
                    reactApplicationContext,
                    componentFactory,
                    EmptyReactNativeConfig(),
                    ViewManagerRegistry(
                        reactInstanceManager?.getOrCreateViewManagers(
                            reactApplicationContext
                        )
                    )
                )
            }
        })
    }
}

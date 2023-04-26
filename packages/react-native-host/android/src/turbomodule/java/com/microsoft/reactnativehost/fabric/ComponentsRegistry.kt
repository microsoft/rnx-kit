package com.microsoft.reactnativehost.fabric

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.fabric.ComponentFactory
import com.facebook.soloader.SoLoader

/**
 * The corresponding C++ implementation is in `android/app/src/main/jni/ComponentsRegistry.cpp`
 */
@DoNotStrip
class ComponentsRegistry @DoNotStrip private constructor(
    componentFactory: ComponentFactory
) {
    companion object {
        @DoNotStrip
        fun register(componentFactory: ComponentFactory): ComponentsRegistry {
            return ComponentsRegistry(componentFactory)
        }

        init {
            SoLoader.loadLibrary("fabricjni")
            SoLoader.loadLibrary("reacttestapp_appmodules")
        }
    }

    @DoNotStrip
    private val mHybridData: HybridData

    @DoNotStrip
    private external fun initHybrid(componentFactory: ComponentFactory): HybridData

    init {
        mHybridData = initHybrid(componentFactory)
    }
}

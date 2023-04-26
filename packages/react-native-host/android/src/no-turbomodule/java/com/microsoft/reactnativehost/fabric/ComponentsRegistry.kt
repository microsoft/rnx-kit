package com.microsoft.reactnativehost.fabric

import com.facebook.react.fabric.ComponentFactory

class ComponentsRegistry private constructor() {
    companion object {
        fun register(
            @Suppress("UNUSED_PARAMETER") componentFactory: ComponentFactory
        ): ComponentsRegistry {
            return ComponentsRegistry()
        }
    }
}

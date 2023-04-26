package com.microsoft.reactnativehost

import android.content.Context
import com.facebook.flipper.android.AndroidFlipperClient
import com.facebook.flipper.android.utils.FlipperUtils
import com.facebook.flipper.core.FlipperClient
import com.facebook.flipper.plugins.crashreporter.CrashReporterPlugin
import com.facebook.flipper.plugins.databases.DatabasesFlipperPlugin
import com.facebook.flipper.plugins.fresco.FrescoFlipperPlugin
import com.facebook.flipper.plugins.inspector.DescriptorMapping
import com.facebook.flipper.plugins.inspector.InspectorFlipperPlugin
import com.facebook.flipper.plugins.network.FlipperOkhttpInterceptor
import com.facebook.flipper.plugins.network.NetworkFlipperPlugin
import com.facebook.flipper.plugins.sharedpreferences.SharedPreferencesFlipperPlugin
import com.facebook.react.ReactInstanceManager
import com.facebook.react.bridge.ReactContext
import com.facebook.react.modules.network.NetworkingModule
import com.microsoft.reactnativehost.compat.ReactInstanceEventListener

@Suppress("unused")
object ReactNativeFlipper {
    @JvmStatic
    fun initialize(context: Context?, reactInstanceManager: ReactInstanceManager) {
        if (!FlipperUtils.shouldEnableFlipper(context)) {
            return
        }

        val client: FlipperClient = AndroidFlipperClient.getInstance(context)
        client.addPlugin(InspectorFlipperPlugin(context, DescriptorMapping.withDefaults()))
        client.addPlugin(DatabasesFlipperPlugin(context))
        client.addPlugin(SharedPreferencesFlipperPlugin(context))
        client.addPlugin(CrashReporterPlugin.getInstance())

        val networkFlipperPlugin = NetworkFlipperPlugin()
        NetworkingModule.setCustomClientBuilder { builder ->
            builder.addNetworkInterceptor(FlipperOkhttpInterceptor(networkFlipperPlugin))
        }
        client.addPlugin(networkFlipperPlugin)

        client.start()

        // FrescoFlipperPlugin needs to ensure that ImagePipelineFactory is
        // initialized and must therefore be run after all native modules have
        // been initialized.
        val reactContext = reactInstanceManager.currentReactContext
        if (reactContext == null) {
            reactInstanceManager.addReactInstanceEventListener(
                object : ReactInstanceEventListener {
                    override fun onReactContextInitialized(reactContext: ReactContext) {
                        reactInstanceManager.removeReactInstanceEventListener(this)
                        reactContext.runOnNativeModulesQueueThread {
                            client.addPlugin(FrescoFlipperPlugin())
                        }
                    }
                }
            )
        } else {
            client.addPlugin(FrescoFlipperPlugin())
        }
    }
}

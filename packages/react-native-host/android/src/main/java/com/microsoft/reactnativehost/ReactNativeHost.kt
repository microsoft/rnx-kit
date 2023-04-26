package com.microsoft.reactnativehost

import android.app.Activity
import android.app.Application
import android.content.Context
import android.os.Bundle
import android.util.Log
import com.facebook.hermes.reactexecutor.HermesExecutorFactory
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactPackage
import com.facebook.react.ReactRootView
import com.facebook.react.bridge.*
import com.facebook.react.common.LifecycleState
import com.facebook.react.devsupport.interfaces.DevOptionHandler
import com.facebook.react.modules.systeminfo.ReactNativeVersion
import com.facebook.react.shell.MainReactPackage
import com.facebook.soloader.SoLoader
import com.microsoft.reactnativehost.compat.ReactInstanceEventListener
import com.microsoft.reactnativehost.fabric.FabricJSIModulePackage

class ReactNativeHost private constructor (
    private val bundleName: String?,
    private val bundleFilePath: String?,
    private val platformBundleNames: MutableList<String>?,
    private val jsBundleLoaderProvider: JSBundleLoaderProvider?,
    private val jsBundleNameProvider: JSBundleNameProvider?,
    private val beforeReactNativeInit: (() -> Unit)?,
    private val afterReactNativeInit: (() -> Unit)?,
    private val nativeModulePackages: MutableList<ReactPackage>,
    private val javaScriptExecutorFactoryOverride: JavaScriptExecutorFactory?,
    private val customDevOptions: MutableList<Pair<String, DevOptionHandler>>? = null,
    private val eagerInit: Boolean = true,
    private val isDev: Boolean = false,
    private val enableFlipper: Boolean = false,
    private val useFabric: Boolean = false,
    hostApplication: Application,
    private val hostInitialActivity: Activity) : com.facebook.react.ReactNativeHost(hostApplication)
{
    interface JSBundleLoaderProvider {
        fun getBundleLoader(bundleName: String, application: Application) : JSBundleLoader
    }
    interface JSBundleNameProvider {
        val bundleName: String?
    }

    data class Builder(
        private var bundleName: String? = null,
        private var bundleFilePath: String? = null,
        private var platformBundleNames: MutableList<String>? = null,
        private var jsBundleLoaderProvider: JSBundleLoaderProvider? = null,
        private var jsBundleNameProvider: JSBundleNameProvider? = null,
        private var beforeReactNativeInit: (() -> Unit)? = null,
        private var afterReactNativeInit: (() -> Unit)? = null,
        private var nativeModulePackages: MutableList<ReactPackage> = mutableListOf(),
        private var javaScriptExecutorFactory: JavaScriptExecutorFactory? = null,
        private var customDevOptions: MutableList<Pair<String, DevOptionHandler>>? = null,
        private var useHermes: Boolean = false,
        private var eagerInit: Boolean = true,
        private var isDev: Boolean = false,
        private var enableFlipper: Boolean = false,
        private var useFabric: Boolean = false,
        private var hostApplication: Application? = null,
        private var hostInitialActivity: Activity? = null) {
        fun bundleName(bundleName: String) = apply { this.bundleName = bundleName; return this }
        fun bundleFilePath(bundleFilePath: String) = apply { this.bundleFilePath = bundleFilePath; return this }
        fun platformBundleNames(platformBundleNames: MutableList<String>) = apply { this.platformBundleNames = platformBundleNames; return this }
        fun jsBundleLoaderProvider(jsundleLoaderProvider: JSBundleLoaderProvider) = apply { this.jsBundleLoaderProvider = jsundleLoaderProvider; return this }
        fun jsBundleNameProvider(jsBundleNameProvider: JSBundleNameProvider) = apply { this.jsBundleNameProvider = jsBundleNameProvider; return this }
        fun beforeReactNativeInit(beforeReactNativeInit: (() -> Unit)) = apply { this.beforeReactNativeInit = beforeReactNativeInit; return this }
        fun afterReactNativeInit(afterReactNativeInit: (() -> Unit)) = apply { this.afterReactNativeInit = afterReactNativeInit; return this }
        fun nativeModulePackages(nativeModulePackages: MutableList<ReactPackage>) = apply { this.nativeModulePackages = nativeModulePackages; return this }
        fun shouldEagerInit(eagerInit: Boolean) = apply { this.eagerInit = eagerInit; return this }
        fun javaScriptExecutorFactory(javaScriptExecutorFactory: JavaScriptExecutorFactory) = apply { this.javaScriptExecutorFactory = javaScriptExecutorFactory; return this }
        fun customDevOptions(customDevOptions: MutableList<Pair<String, DevOptionHandler>>) = apply { this.customDevOptions = customDevOptions; return this }
        fun useHermes(useHermes: Boolean) = apply { this.useHermes = useHermes; return this }
        fun isDev(isDev: Boolean) = apply { this.isDev = isDev; return this }
        fun enableFlipper(enableFlipper: Boolean) = apply { this.enableFlipper = enableFlipper; return this }
        fun useFabric(useFabric: Boolean) = apply { this.useFabric = useFabric; return this }
        fun application(hostApplication: Application) = apply { this.hostApplication = hostApplication; return this }
        fun activity(hostInitialActivity: Activity) = apply { this.hostInitialActivity = hostInitialActivity; return this }
        fun build(): ReactNativeHost? = run {
            hostApplication!!
            hostInitialActivity!!
            return ReactNativeHost(
                bundleName,
                bundleFilePath,
                platformBundleNames,
                jsBundleLoaderProvider,
                jsBundleNameProvider,
                beforeReactNativeInit,
                afterReactNativeInit,
                nativeModulePackages,
                javaScriptExecutorFactory,
                customDevOptions,
                eagerInit,
                isDev,
                enableFlipper,
                useFabric,
                hostApplication!!,
                hostInitialActivity!!
            )
        }
    }

    init {
        val reactInstanceListener = object : ReactInstanceEventListener {
            override fun onReactContextInitialized(context: ReactContext?) {
                afterReactNativeInit?.invoke()

                // proactively removing the listener to avoid leaking memory
                // and to avoid dupe calls to afterReactNativeInit()
                reactInstanceManager.removeReactInstanceEventListener(this)
            }
        }
        reactInstanceManager.addReactInstanceEventListener(reactInstanceListener)
        reactInstanceManager.addReactInstanceEventListener { reactContext -> onReactContextInitialized(reactContext) }
        beforeReactNativeInit?.invoke()

        if(this.eagerInit) {
            reactInstanceManager.createReactContextInBackground()
        }

        if (enableFlipper) {
            try {
                Class.forName("com.microsoft.reacttestapp.ReactNativeFlipper")
                    .getMethod("initialize", Context::class.java, ReactInstanceManager::class.java)
                    .invoke(null, application, reactInstanceManager)
            } catch (e: ClassNotFoundException) {
                val flipperVersion = "0.125.0" // TODO : Find the right recommended version
                if (flipperVersion != "0") {
                    val major = ReactNativeVersion.VERSION["major"] as Int
                    val minor = ReactNativeVersion.VERSION["minor"] as Int
                    Log.i(
                        "ReactTestApp",
                        "To use Flipper, define `FLIPPER_VERSION` in your `gradle.properties`. " +
                            "Since you're using React Native $major.$minor, we recommend setting " +
                            "`FLIPPER_VERSION=$flipperVersion`."
                    )
                }
            }
        }

        customDevOptions?.forEach{
            reactInstanceManager.devSupportManager.addCustomDevOption(it.first, it.second)
        }

    }

    fun reloadFromServer() {
        reactInstanceManager.devSupportManager.handleReloadJS()
    }

    fun restartFromDisk(activity: Activity?) { // TODO : Better naming
        clear()

        reactInstanceManager.run {
            createReactContextInBackground()
            if (activity != null) {
                onHostResume(activity)
            }
        }
    }

    override fun createReactInstanceManager(): ReactInstanceManager {
        val builder = ReactInstanceManager.builder()
            .setApplication(application)
            .setJSMainModulePath(jsMainModuleName)
            .setUseDeveloperSupport(useDeveloperSupport)
            .setRedBoxHandler(redBoxHandler)
            .setJSIModulesPackage(jsiModulePackage)

        if(hostInitialActivity != null) {
            builder.setInitialLifecycleState(LifecycleState.RESUMED)
            builder.setCurrentActivity(hostInitialActivity)
        }

        if(javaScriptExecutorFactoryOverride != null)
            builder.setJavaScriptExecutorFactory(javaScriptExecutorFactoryOverride)
        else {
            SoLoader.init(application, false)
            builder.setJavaScriptExecutorFactory(HermesExecutorFactory())
        }

        when {
            jsBundleLoaderProvider != null -> {
                builder.setJSBundleLoader(object : JSBundleLoader() {
                    override fun loadScript(jsBundleLoaderDelegate: JSBundleLoaderDelegate): String? {
                        if(platformBundleNames != null) {
                            for (platformBundleName in platformBundleNames) {
                                jsBundleLoaderProvider.getBundleLoader(
                                    platformBundleName,
                                    application
                                ).loadScript(jsBundleLoaderDelegate)
                            }
                        }
                        jsBundleLoaderProvider.getBundleLoader(bundleName!!, application)
                            .loadScript(jsBundleLoaderDelegate)
                        return null
                    }
                })
            }
            bundleFilePath != null -> {
                builder.setJSBundleFile(bundleFilePath)
            }
            bundleName != null -> {
                builder.setBundleAssetName(bundleName)
            }
        }

        builder.addPackages(packages)
        builder.addPackage(MainReactPackage())

        return builder.build()
    }

    private val reactInstanceEventListenerList: MutableList<ReactInstanceEventListener> = ArrayList()
    fun addReactInstanceEventListener(reactInstanceEventListener: ReactInstanceEventListener) {
        reactInstanceEventListenerList.add(reactInstanceEventListener)
    }

    private fun onReactContextInitialized(reactContext: ReactContext) {
        reactInstanceEventListenerList.forEach { it.onReactContextInitialized(reactContext)}
    }

    override fun getUseDeveloperSupport(): Boolean {
        return isDev
    }

    override fun getPackages(): MutableList<ReactPackage> {
        return nativeModulePackages
    }

    override fun getJSIModulePackage(): JSIModulePackage? {
        return if (useFabric) {
            FabricJSIModulePackage(this)
        } else {
            null
        }
    }

    fun createRootView(componentName: String, initialProps: Bundle?, activity: Activity) : ReactRootView {
        val rootView = ReactRootView(activity)
        rootView.startReactApplication(reactInstanceManager, componentName, initialProps)
        return rootView
    }
}

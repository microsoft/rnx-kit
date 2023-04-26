package com.microsoft.reactnativehost.turbomodule

import com.facebook.jni.HybridData
import com.facebook.react.ReactPackage
import com.facebook.react.ReactPackageTurboModuleManagerDelegate
import com.facebook.react.bridge.ReactApplicationContext

/**
 * These type aliases are here to prevent `@react-native-community/cli` from
 * marking them as native modules to autolink.
 *
 * See also `matchClassName` in
 * https://github.com/react-native-community/cli/blob/8.x/packages/platform-android/src/config/findPackageClassName.ts#L25
 */
typealias PackagesList = List<ReactPackage?>
typealias ReactTurboModuleManagerDelegate = ReactPackageTurboModuleManagerDelegate
typealias ReactTurboModuleManagerDelegateBuilder = ReactPackageTurboModuleManagerDelegate.Builder

/**
 * The corresponding C++ implementation is in `android/app/src/main/jni/TurboModuleManagerDelegate.cpp`
 */
class TurboModuleManagerDelegate protected constructor(
    reactApplicationContext: ReactApplicationContext?,
    packages: PackagesList?
) : ReactTurboModuleManagerDelegate(reactApplicationContext, packages) {

    external override fun initHybrid(): HybridData?

    external fun canCreateTurboModule(moduleName: String?): Boolean

    class Builder : ReactTurboModuleManagerDelegateBuilder() {
        override fun build(
            context: ReactApplicationContext?,
            packages: PackagesList?
        ): TurboModuleManagerDelegate {
            return TurboModuleManagerDelegate(context, packages)
        }
    }
}

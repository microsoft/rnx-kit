package org.reactnativewebapis.webstorage

import android.content.Context.MODE_PRIVATE
import android.content.SharedPreferences
import androidx.core.content.edit
import com.facebook.react.bridge.ReactApplicationContext

class WebStorageModule(context: ReactApplicationContext) : NativeWebStorageSpec(context) {

    companion object {
        const val NAME = NativeWebStorageSpec.NAME
    }

    private val sharedPreferences: SharedPreferences =
        reactApplicationContext.getSharedPreferences(
            reactApplicationContext.packageName,
            MODE_PRIVATE
        )

    override fun length(): Double {
        return sharedPreferences.all.size.toDouble()
    }

    override fun key(index: Double): String? {
        // The order of the elements in `SharedPreferences` is not defined.
        // https://developer.android.com/reference/android/content/SharedPreferences#getAll()
        return null
    }

    override fun getItem(key: String): String? {
        return sharedPreferences.getString(key, null)
    }

    override fun setItem(key: String, value: String): Boolean {
        sharedPreferences.edit { putString(key, value) }
        return false
    }

    override fun removeItem(key: String): Boolean {
        sharedPreferences.edit { remove(key) }
        return false
    }

    override fun clear(): Boolean {
        sharedPreferences.edit { clear() }
        return false
    }
}

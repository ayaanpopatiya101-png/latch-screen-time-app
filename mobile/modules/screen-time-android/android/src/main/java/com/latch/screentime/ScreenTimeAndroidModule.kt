package com.latch.screentime

import android.app.AppOpsManager
import android.app.usage.UsageStatsManager
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.os.Process
import android.provider.Settings
import com.facebook.react.bridge.*
import com.facebook.react.module.annotations.ReactModule

@ReactModule(name = ScreenTimeAndroidModule.NAME)
class ScreenTimeAndroidModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    companion object {
        const val NAME = "ScreenTimeAndroid"
        /** SharedPreferences file accessible by both the module and LatchAccessibilityService. */
        const val PREFS = "latch_screen_time_prefs"
        const val KEY_SHIELDED_PACKAGES = "shielded_packages"
        const val KEY_SHIELD_MODE = "shield_mode"
        const val KEY_SHIELD_ENDS_AT = "shield_ends_at"
    }

    override fun getName(): String = NAME

    // -------------------------------------------------------------------------
    // Permission helpers
    // -------------------------------------------------------------------------

    private fun hasUsageAccess(): Boolean {
        val appOps = reactApplicationContext
            .getSystemService(Context.APP_OPS_SERVICE) as AppOpsManager
        val mode = appOps.unsafeCheckOpNoThrow(
            AppOpsManager.OPSTR_GET_USAGE_STATS,
            Process.myUid(),
            reactApplicationContext.packageName
        )
        return mode == AppOpsManager.MODE_ALLOWED
    }

    private fun hasAccessibility(): Boolean {
        val serviceClass = "${reactApplicationContext.packageName}/.LatchAccessibilityService"
        val enabledServices = Settings.Secure.getString(
            reactApplicationContext.contentResolver,
            Settings.Secure.ENABLED_ACCESSIBILITY_SERVICES
        ) ?: ""
        return enabledServices.contains(serviceClass)
    }

    // -------------------------------------------------------------------------
    // Exported methods
    // -------------------------------------------------------------------------

    @ReactMethod
    fun getUsageAccessStatus(promise: Promise) {
        promise.resolve(if (hasUsageAccess()) "granted" else "denied")
    }

    @ReactMethod
    fun requestUsageAccess(promise: Promise) {
        val intent = Intent(Settings.ACTION_USAGE_ACCESS_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactApplicationContext.startActivity(intent)
        // Resolve after a short delay — the user will navigate back and the
        // JS caller should re-call getUsageAccessStatus() to confirm.
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            promise.resolve(if (hasUsageAccess()) "granted" else "denied")
        }, 2_000)
    }

    @ReactMethod
    fun getAccessibilityStatus(promise: Promise) {
        promise.resolve(if (hasAccessibility()) "granted" else "denied")
    }

    @ReactMethod
    fun requestAccessibility(promise: Promise) {
        val intent = Intent(Settings.ACTION_ACCESSIBILITY_SETTINGS).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        }
        reactApplicationContext.startActivity(intent)
        android.os.Handler(android.os.Looper.getMainLooper()).postDelayed({
            promise.resolve(if (hasAccessibility()) "granted" else "denied")
        }, 2_000)
    }

    @ReactMethod
    fun getTodayUsage(promise: Promise) {
        if (!hasUsageAccess()) {
            promise.reject("NO_PERMISSION", "Usage access not granted")
            return
        }
        val usm = reactApplicationContext
            .getSystemService(Context.USAGE_STATS_SERVICE) as UsageStatsManager
        val now = System.currentTimeMillis()
        val startOfDay = now - (now % 86_400_000)
        val stats = usm.queryUsageStats(UsageStatsManager.INTERVAL_DAILY, startOfDay, now)
        val pm = reactApplicationContext.packageManager
        val results = WritableNativeArray()
        stats
            .filter { it.totalTimeInForeground > 0 }
            .sortedByDescending { it.totalTimeInForeground }
            .take(20)
            .forEach { stat ->
                val map = WritableNativeMap()
                map.putString("bundleId", stat.packageName)
                val label = try {
                    pm.getApplicationLabel(
                        pm.getApplicationInfo(stat.packageName, 0)
                    ).toString()
                } catch (e: PackageManager.NameNotFoundException) {
                    stat.packageName
                }
                map.putString("displayName", label)
                map.putInt("minutesToday", (stat.totalTimeInForeground / 60_000).toInt())
                map.putString("category", categorize(stat.packageName))
                results.pushMap(map)
            }
        promise.resolve(results)
    }

    @ReactMethod
    fun startShield(packageNames: ReadableArray, mode: String, endsAtMs: Double, promise: Promise) {
        if (!hasAccessibility()) {
            val map = WritableNativeMap()
            map.putBoolean("ok", false)
            map.putString("reason", "native-permission-required")
            promise.resolve(map)
            return
        }
        // Persist shield config for LatchAccessibilityService to read.
        val prefs = reactApplicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        val pkgList = (0 until packageNames.size()).map { packageNames.getString(it) }
        prefs.edit()
            .putStringSet(KEY_SHIELDED_PACKAGES, pkgList.toSet())
            .putString(KEY_SHIELD_MODE, mode)
            .putLong(KEY_SHIELD_ENDS_AT, endsAtMs.toLong())
            .apply()
        // Start the foreground service.
        val serviceIntent = Intent(reactApplicationContext, LatchShieldService::class.java)
        reactApplicationContext.startForegroundService(serviceIntent)
        val map = WritableNativeMap()
        map.putBoolean("ok", true)
        promise.resolve(map)
    }

    @ReactMethod
    fun stopShield(promise: Promise) {
        val prefs = reactApplicationContext
            .getSharedPreferences(PREFS, Context.MODE_PRIVATE)
        prefs.edit()
            .remove(KEY_SHIELDED_PACKAGES)
            .remove(KEY_SHIELD_MODE)
            .remove(KEY_SHIELD_ENDS_AT)
            .apply()
        val serviceIntent = Intent(reactApplicationContext, LatchShieldService::class.java)
        reactApplicationContext.stopService(serviceIntent)
        val map = WritableNativeMap()
        map.putBoolean("ok", true)
        promise.resolve(map)
    }

    // -------------------------------------------------------------------------
    // Helpers
    // -------------------------------------------------------------------------

    private fun categorize(pkg: String): String = when {
        pkg.contains("tiktok") || pkg.contains("youtube") || pkg.contains("netflix")
        || pkg.contains("twitch") -> "video"
        pkg.contains("instagram") || pkg.contains("twitter") || pkg.contains("snapchat")
        || pkg.contains("facebook") -> "social"
        pkg.contains("game") || pkg.contains("clash") || pkg.contains("candy") -> "games"
        pkg.contains("slack") || pkg.contains("notion") || pkg.contains("docs") -> "productivity"
        else -> "other"
    }
}

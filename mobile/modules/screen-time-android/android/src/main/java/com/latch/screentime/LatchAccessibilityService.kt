package com.latch.screentime

import android.accessibilityservice.AccessibilityService
import android.accessibilityservice.AccessibilityServiceInfo
import android.content.Context
import android.content.Intent
import android.view.accessibility.AccessibilityEvent
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale

/**
 * Latch AccessibilityService — watches for foreground app changes and
 * launches the Friction/DeepLock overlay when a shielded package is opened.
 *
 * Declaration in AndroidManifest.xml (added by the Expo config plugin):
 * <service
 *   android:name=".LatchAccessibilityService"
 *   android:permission="android.permission.BIND_ACCESSIBILITY_SERVICE"
 *   android:exported="true">
 *   <intent-filter>
 *     <action android:name="android.accessibilityservice.AccessibilityService" />
 *   </intent-filter>
 *   <meta-data
 *     android:name="android.accessibilityservice"
 *     android:resource="@xml/accessibility_service_config" />
 * </service>
 */
class LatchAccessibilityService : AccessibilityService() {

    override fun onServiceConnected() {
        serviceInfo = serviceInfo.apply {
            eventTypes = AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED
            feedbackType = AccessibilityServiceInfo.FEEDBACK_GENERIC
            flags = AccessibilityServiceInfo.FLAG_INCLUDE_NOT_IMPORTANT_VIEWS
            notificationTimeout = 100
        }
    }

    override fun onAccessibilityEvent(event: AccessibilityEvent) {
        if (event.eventType != AccessibilityEvent.TYPE_WINDOW_STATE_CHANGED) return
        val pkg = event.packageName?.toString() ?: return

        val prefs = getSharedPreferences(ScreenTimeAndroidModule.PREFS, Context.MODE_PRIVATE)
        val shielded = prefs.getStringSet(ScreenTimeAndroidModule.KEY_SHIELDED_PACKAGES, emptySet())
            ?: return
        val endsAt = prefs.getLong(ScreenTimeAndroidModule.KEY_SHIELD_ENDS_AT, 0L)

        // If shield has expired, clear it and do nothing.
        if (endsAt > 0 && System.currentTimeMillis() > endsAt) {
            prefs.edit()
                .remove(ScreenTimeAndroidModule.KEY_SHIELDED_PACKAGES)
                .remove(ScreenTimeAndroidModule.KEY_SHIELD_MODE)
                .remove(ScreenTimeAndroidModule.KEY_SHIELD_ENDS_AT)
                .apply()
            stopService(Intent(this, LatchShieldService::class.java))
            return
        }

        if (pkg in shielded) {
            val mode = prefs.getString(ScreenTimeAndroidModule.KEY_SHIELD_MODE, "gentle") ?: "gentle"
            launchShieldOverlay(pkg, mode)
        }
    }

    override fun onInterrupt() { /* required */ }

    private fun launchShieldOverlay(blockedPackage: String, mode: String) {
        val intent = Intent(this, LatchShieldActivity::class.java).apply {
            addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP)
            putExtra("blocked_package", blockedPackage)
            putExtra("shield_mode", mode)
        }
        startActivity(intent)
    }
}

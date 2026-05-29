package com.latch.screentime

import android.app.Activity
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.view.View
import android.view.WindowManager
import android.widget.Button
import android.widget.TextView

/**
 * Full-screen overlay shown by LatchAccessibilityService when the user
 * opens a shielded app. Renders Latch branding + mode-specific copy.
 *
 * In production you'll replace this Activity with a React Native one
 * (or a Jetpack Compose screen) once the UI is finalised. This version
 * uses plain Android Views so it works without any React Native context.
 */
class LatchShieldActivity : Activity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        // Make the activity cover the full screen including the status bar.
        window.addFlags(
            WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON or
            WindowManager.LayoutParams.FLAG_SHOW_WHEN_LOCKED
        )

        val blockedPkg = intent.getStringExtra("blocked_package") ?: ""
        val mode = intent.getStringExtra("shield_mode") ?: "gentle"
        val pm = packageManager
        val appLabel = try {
            pm.getApplicationLabel(pm.getApplicationInfo(blockedPkg, 0)).toString()
        } catch (e: Exception) { blockedPkg }

        // Build a minimal UI programmatically.
        val root = android.widget.LinearLayout(this).apply {
            orientation = android.widget.LinearLayout.VERTICAL
            gravity = android.view.Gravity.CENTER
            setPadding(64, 64, 64, 64)
            setBackgroundColor(if (mode == "deep-lock") 0xFF171614.toInt() else 0xFFF9F8F5.toInt())
        }

        val textColor = if (mode == "deep-lock") 0xFFCDCCCA.toInt() else 0xFF28251D.toInt()

        val title = TextView(this).apply {
            text = when (mode) {
                "deep-lock" -> "Deep Lock active"
                "friction"  -> "Heads up!"
                else        -> "Gentle reminder"
            }
            textSize = 24f
            setTextColor(textColor)
            gravity = android.view.Gravity.CENTER
        }

        val body = TextView(this).apply {
            text = when (mode) {
                "deep-lock" -> "$appLabel is locked. Complete your focus window to earn an unlock."
                "friction"  -> "You set a friction block on $appLabel. Open Latch to spend credits."
                else        -> "Lumi suggests a quick break from $appLabel."
            }
            textSize = 16f
            setTextColor(textColor)
            gravity = android.view.Gravity.CENTER
            setPadding(0, 32, 0, 48)
        }

        val openLatch = Button(this).apply {
            text = "Open Latch"
            setOnClickListener {
                val launch = packageManager.getLaunchIntentForPackage(packageName)
                if (launch != null) startActivity(launch)
                finish()
            }
        }

        val continueBtn = Button(this).apply {
            text = if (mode == "gentle") "Continue anyway" else "Go back"
            setOnClickListener { finish() }
        }

        root.addView(title)
        root.addView(body)
        root.addView(openLatch)
        if (mode == "gentle" || mode == "friction") root.addView(continueBtn)
        setContentView(root)
    }
}

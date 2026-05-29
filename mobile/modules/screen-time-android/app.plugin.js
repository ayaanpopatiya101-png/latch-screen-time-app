/**
 * Expo config plugin for screen-time-android.
 *
 * Adds to AndroidManifest.xml:
 *   - LatchAccessibilityService declaration
 *   - LatchShieldService declaration (FOREGROUND_SERVICE_SPECIAL_USE on API 34+)
 *   - LatchShieldActivity declaration
 *   - RECEIVE_BOOT_COMPLETED permission (so the foreground service can restart after reboot)
 *
 * Usage in app.json:
 *   "plugins": [
 *     ["./modules/screen-time-android/app.plugin.js"]
 *   ]
 */
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = function withScreenTimeAndroid(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults;
    const app = manifest.manifest.application[0];

    // Ensure arrays exist
    if (!app.service) app.service = [];
    if (!app.activity) app.activity = [];
    if (!manifest.manifest['uses-permission']) manifest.manifest['uses-permission'] = [];

    const permissions = manifest.manifest['uses-permission'];
    const addPerm = (name) => {
      if (!permissions.some((p) => p.$?.['android:name'] === name)) {
        permissions.push({ $: { 'android:name': name } });
      }
    };
    addPerm('android.permission.RECEIVE_BOOT_COMPLETED');
    addPerm('android.permission.FOREGROUND_SERVICE');
    addPerm('android.permission.FOREGROUND_SERVICE_SPECIAL_USE');

    // AccessibilityService
    const accessibilitySvcName = '.LatchAccessibilityService';
    if (!app.service.some((s) => s.$?.['android:name'] === accessibilitySvcName)) {
      app.service.push({
        $: {
          'android:name': accessibilitySvcName,
          'android:permission': 'android.permission.BIND_ACCESSIBILITY_SERVICE',
          'android:exported': 'true',
        },
        'intent-filter': [{
          action: [{ $: { 'android:name': 'android.accessibilityservice.AccessibilityService' } }],
        }],
        'meta-data': [{
          $: {
            'android:name': 'android.accessibilityservice',
            'android:resource': '@xml/accessibility_service_config',
          },
        }],
      });
    }

    // ForegroundService
    const shieldSvcName = '.LatchShieldService';
    if (!app.service.some((s) => s.$?.['android:name'] === shieldSvcName)) {
      app.service.push({
        $: {
          'android:name': shieldSvcName,
          'android:foregroundServiceType': 'specialUse',
          'android:exported': 'false',
        },
        'property': [{
          $: {
            'android:name': 'android.app.PROPERTY_SPECIAL_USE_FGS_SUBTYPE',
            'android:value': 'app-usage-blocking',
          },
        }],
      });
    }

    // ShieldActivity
    const shieldActName = '.LatchShieldActivity';
    if (!app.activity.some((a) => a.$?.['android:name'] === shieldActName)) {
      app.activity.push({
        $: {
          'android:name': shieldActName,
          'android:theme': '@android:style/Theme.Translucent.NoTitleBar.Fullscreen',
          'android:exported': 'false',
          'android:launchMode': 'singleTask',
        },
      });
    }

    return cfg;
  });
};

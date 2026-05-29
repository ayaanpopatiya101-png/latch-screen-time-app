/**
 * Expo config plugin for screen-time-ios.
 *
 * Adds to the iOS project:
 *   - App Group capability (group.com.latch.screentime)
 *   - The FamilyControls entitlement (already in app.json, this validates it)
 *   - NSUserNotificationsUsageDescription is already set via app.json infoPlist
 *
 * Usage in app.json:
 *   "plugins": [
 *     ["./modules/screen-time-ios/app.plugin.js"]
 *   ]
 *
 * IMPORTANT: The DeviceActivityMonitor and ShieldConfiguration extensions must
 * be added as Xcode targets manually (Xcode does not support fully scripted
 * extension targets via Expo config plugins yet). See NATIVE_SETUP.md.
 */
const { withEntitlementsPlist } = require('@expo/config-plugins');

module.exports = function withScreenTimeIOS(config) {
  return withEntitlementsPlist(config, (cfg) => {
    const ents = cfg.modResults;

    // App Group — shared between main app, DeviceActivityMonitor, and ShieldConfiguration.
    const appGroups = ents['com.apple.security.application-groups'] ?? [];
    const group = 'group.com.latch.screentime';
    if (!appGroups.includes(group)) {
      ents['com.apple.security.application-groups'] = [...appGroups, group];
    }

    // FamilyControls entitlement — already in app.json but added here defensively.
    ents['com.apple.developer.family-controls'] = true;

    return cfg;
  });
};

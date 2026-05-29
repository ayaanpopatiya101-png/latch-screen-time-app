import DeviceActivity
import ManagedSettings
import Foundation

/// DeviceActivityMonitor runs in its own extension process — it fires even when
/// the main Latch app is not running. It reads the shielded-app selection from
/// the shared App Group, applies ManagedSettings, and writes a usage snapshot
/// for the main app to display on the dashboard.
///
/// Xcode setup required (see NATIVE_SETUP.md):
///   1. Add a new target: File › New › Target › Device Activity Monitor Extension
///   2. Name it LatchDeviceActivityMonitor
///   3. Replace the generated Monitor.swift content with this file
///   4. Set the App Group to group.com.latch.screentime in Signing & Capabilities
class LatchDeviceActivityMonitor: DeviceActivityMonitor {

  private let store = ManagedSettingsStore()
  private let defaults = UserDefaults(suiteName: "group.com.latch.screentime")

  override func intervalDidStart(for activity: DeviceActivityName) {
    super.intervalDidStart(for: activity)

    // Retrieve stored FamilyActivitySelection and apply the shield.
    guard
      let data = defaults?.data(forKey: "latch_activity_selection"),
      let selection = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: data)
    else { return }

    store.shield.applications = selection.applicationTokens
    store.shield.applicationCategories = .specific(selection.categoryTokens)
  }

  override func intervalDidEnd(for activity: DeviceActivityName) {
    super.intervalDidEnd(for: activity)
    store.clearAllSettings()
  }

  override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name, activity: DeviceActivityName) {
    super.eventDidReachThreshold(event, activity: activity)
    // Future: post a local notification via UNUserNotificationCenter when a per-app
    // usage threshold is crossed (e.g. "You've used TikTok for 30 min today").
  }
}

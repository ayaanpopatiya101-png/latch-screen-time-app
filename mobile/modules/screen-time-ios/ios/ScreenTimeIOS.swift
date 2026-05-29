import Foundation
import FamilyControls
import DeviceActivity
import ManagedSettings
import React

/// App Group shared between the main app, DeviceActivityMonitor extension,
/// and ShieldConfiguration extension.
let kAppGroup = "group.com.latch.screentime"
let kShieldBundleIdsKey = "latch_shielded_bundle_ids"
let kShieldModeKey      = "latch_shield_mode"

@objc(ScreenTimeIOS)
final class ScreenTimeIOS: NSObject, RCTBridgeModule {

  static func moduleName() -> String! { "ScreenTimeIOS" }
  static func requiresMainQueueSetup() -> Bool { false }

  private let store = ManagedSettingsStore()
  private let deviceCenter = DeviceActivityCenter()

  // MARK: – Authorization

  @objc func requestAuthorization(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    Task {
      do {
        try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
        resolve("granted")
      } catch {
        // Treat any error (including user denial) as denied so JS can handle gracefully.
        resolve("denied")
      }
    }
  }

  @objc func getAuthorizationStatus(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    switch AuthorizationCenter.shared.authorizationStatus {
    case .approved:       resolve("granted")
    case .denied:         resolve("denied")
    case .notDetermined:  resolve("not-determined")
    @unknown default:     resolve("not-determined")
    }
  }

  // MARK: – Usage

  /// Apple's FamilyControls does NOT expose per-app minute counts to third-party
  /// apps (that's intentional — privacy). What IS available is DeviceActivity
  /// report extensions (iOS 16+). For the MVP we read aggregate usage via
  /// a DeviceActivityReport extension rendered in a SwiftUI view.
  ///
  /// This method returns the cached daily-usage snapshot written by the
  /// DeviceActivityMonitor extension into the shared App Group UserDefaults.
  /// The extension writes: [{"bundleId": "com.apple.token.<hash>",
  ///   "displayName": "TikTok", "minutesToday": 42, "category": "video"}]
  @objc func getTodayUsage(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    let defaults = UserDefaults(suiteName: kAppGroup)
    guard
      let raw = defaults?.string(forKey: "latch_usage_snapshot"),
      let data = raw.data(using: .utf8),
      let json = try? JSONSerialization.jsonObject(with: data) as? [[String: Any]]
    else {
      // No snapshot yet (first run or extension hasn't fired). Return empty.
      resolve([])
      return
    }
    resolve(json)
  }

  // MARK: – Shield

  @objc func startShield(
    _ bundleIds: [String],
    mode: String,
    endsAt: Double,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard AuthorizationCenter.shared.authorizationStatus == .approved else {
      resolve(["ok": false, "reason": "family-controls-not-granted"])
      return
    }

    // Persist mode so ShieldConfiguration extension can read it.
    let defaults = UserDefaults(suiteName: kAppGroup)
    defaults?.set(bundleIds, forKey: kShieldBundleIdsKey)
    defaults?.set(mode, forKey: kShieldModeKey)

    // Apply the shield using ManagedSettings.
    // bundleIds here are the opaque token strings stored in App Group by
    // FamilyActivityPicker. We rebuild ApplicationTokens from the stored selection.
    if let selectionData = defaults?.data(forKey: "latch_activity_selection"),
       let selection = try? PropertyListDecoder().decode(FamilyActivitySelection.self, from: selectionData) {
      store.shield.applications = selection.applicationTokens
      resolve(["ok": true])
    } else {
      // No picker selection saved yet — guide user to permissions screen.
      resolve(["ok": false, "reason": "no-activity-selection"])
    }
  }

  @objc func stopShield(
    _ resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    store.clearAllSettings()
    resolve(["ok": true])
  }

  // MARK: – DeviceActivity scheduling

  @objc func scheduleActivity(
    _ activityName: String,
    startHour: Int,
    startMinute: Int,
    endHour: Int,
    endMinute: Int,
    bundleIds: [String],
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    guard AuthorizationCenter.shared.authorizationStatus == .approved else {
      resolve(["ok": false, "reason": "family-controls-not-granted"])
      return
    }

    // Store the bundle-id list so the DeviceActivityMonitor extension can read it.
    let defaults = UserDefaults(suiteName: kAppGroup)
    defaults?.set(bundleIds, forKey: "latch_activity_\(activityName)_ids")

    let schedule = DeviceActivitySchedule(
      intervalStart: DateComponents(hour: startHour, minute: startMinute),
      intervalEnd:   DateComponents(hour: endHour,   minute: endMinute),
      repeats: true
    )
    let activity = DeviceActivityName(activityName)
    do {
      try deviceCenter.startMonitoring(activity, during: schedule)
      resolve(["ok": true])
    } catch {
      resolve(["ok": false, "reason": error.localizedDescription])
    }
  }

  @objc func cancelActivity(
    _ activityName: String,
    resolver resolve: @escaping RCTPromiseResolveBlock,
    rejecter reject: @escaping RCTPromiseRejectBlock
  ) {
    deviceCenter.stopMonitoring([DeviceActivityName(activityName)])
    resolve(["ok": true])
  }
}

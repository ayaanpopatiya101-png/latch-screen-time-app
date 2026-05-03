import Foundation

#if canImport(FamilyControls)
import FamilyControls
#endif
#if canImport(DeviceActivity)
import DeviceActivity
#endif
#if canImport(ManagedSettings)
import ManagedSettings
#endif

// MARK: - ScreenTimeManager
//
// Wraps Apple's three Screen-Time APIs:
//   - FamilyControls   : ask the user for authorization + present the
//                        FamilyActivityPicker so they can choose which
//                        apps Latch should manage.
//   - DeviceActivity   : schedule daily monitoring windows; the
//                        DeviceActivityMonitor extension is what actually
//                        wakes up when limits are reached.
//   - ManagedSettings  : apply ShieldConfiguration restrictions to the
//                        chosen apps/categories.
//
// IMPORTANT (entitlements):
//   Family Controls requires the `com.apple.developer.family-controls`
//   entitlement. Apple grants this on individual approval — request via
//   https://developer.apple.com/contact/request/family-controls-distribution
//   The app will *not* function on a real device until that's granted.
//
// All Apple APIs are gated on iOS 16+ and on the framework being available
// at compile time, so this file still compiles in environments where the
// SDK headers are missing (e.g. CI pre-Xcode).

@available(iOS 16.0, *)
final class ScreenTimeManager {

    #if canImport(ManagedSettings)
    /// Restrictions store — write-through for shields/limits.
    let store = ManagedSettingsStore(named: .init("LatchDefaultStore"))
    #endif

    #if canImport(FamilyControls)
    /// The user-selected apps/categories/web domains to manage.
    /// Persist this via App-Group UserDefaults so the DeviceActivity and
    /// Shield extensions can read the same selection.
    var selection = FamilyActivitySelection()
    #endif

    // MARK: Authorization

    /// Returns true once the user has tapped "Allow" in the Family Controls sheet.
    func currentAuthorizationStatus() async -> Bool {
        #if canImport(FamilyControls)
        return AuthorizationCenter.shared.authorizationStatus == .approved
        #else
        return false
        #endif
    }

    /// Presents Apple's Family Controls authorization prompt.
    /// Must be called from the main app process — extensions cannot prompt.
    @discardableResult
    func requestAuthorization() async -> Bool {
        #if canImport(FamilyControls)
        do {
            try await AuthorizationCenter.shared.requestAuthorization(for: .individual)
            return AuthorizationCenter.shared.authorizationStatus == .approved
        } catch {
            // Expected on Simulator without the entitlement profile.
            print("Latch: FamilyControls authorization failed: \(error)")
            return false
        }
        #else
        return false
        #endif
    }

    // MARK: Monitoring schedule

    /// Schedule a daily 24-hour window so the DeviceActivity extension is
    /// invoked for threshold events. The actual per-app limits live in
    /// `DeviceActivityEvent` objects, which you build from the user's
    /// FamilyActivitySelection + their per-app daily limits.
    func startDailyMonitoring() {
        #if canImport(DeviceActivity)
        let schedule = DeviceActivitySchedule(
            intervalStart: DateComponents(hour: 0, minute: 0),
            intervalEnd:   DateComponents(hour: 23, minute: 59),
            repeats: true,
            warningTime: DateComponents(minute: 5)
        )

        // TODO: build `events` from the user's per-app daily limits.
        // Example:
        // let event = DeviceActivityEvent(
        //     applications: selection.applicationTokens,
        //     threshold: DateComponents(minute: 30)
        // )
        // events: [DeviceActivityEvent.Name("dailyLimit"): event]

        let center = DeviceActivityCenter()
        do {
            try center.startMonitoring(.daily, during: schedule, events: [:])
        } catch {
            print("Latch: failed to start DeviceActivity monitoring: \(error)")
        }
        #endif
    }

    func stopMonitoring() {
        #if canImport(DeviceActivity)
        DeviceActivityCenter().stopMonitoring([.daily])
        #endif
    }

    // MARK: Shielding

    /// Apply a Shield to the user-selected apps. The ShieldConfiguration
    /// extension target controls how the shield itself looks (Latch
    /// branding, "Bridge" CTA, etc.).
    func applyShield() {
        #if canImport(ManagedSettings) && canImport(FamilyControls)
        store.shield.applications = selection.applicationTokens.isEmpty
            ? nil
            : selection.applicationTokens
        store.shield.applicationCategories = selection.categoryTokens.isEmpty
            ? nil
            : .specific(selection.categoryTokens)
        #endif
    }

    func clearShield() {
        #if canImport(ManagedSettings)
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        #endif
    }
}

#if canImport(DeviceActivity)
@available(iOS 16.0, *)
extension DeviceActivityName {
    static let daily = Self("LatchDaily")
}
#endif

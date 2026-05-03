import Foundation

#if canImport(DeviceActivity)
import DeviceActivity
#endif
#if canImport(ManagedSettings)
import ManagedSettings
#endif
#if canImport(FamilyControls)
import FamilyControls
#endif

// MARK: - LatchDeviceActivityMonitor
//
// This file belongs to a *separate* extension target — typically named
// `LatchDeviceActivityMonitor` — created in Xcode via:
//   File -> New -> Target… -> Device Activity Monitor Extension
//
// Xcode will generate an Info.plist with the correct
// NSExtensionPrincipalClass; point it at this class.
//
// The extension runs out-of-process and is woken up by the system at the
// boundaries of a DeviceActivitySchedule and at DeviceActivityEvent
// thresholds. We never have a UI here — only ManagedSettings writes.
//
// Required entitlements on this target:
//   - com.apple.developer.family-controls
//   - App Group matching the main app (e.g. group.com.latch.app)

@available(iOS 16.0, *)
final class LatchDeviceActivityMonitor: DeviceActivityMonitor {

    #if canImport(ManagedSettings)
    private let store = ManagedSettingsStore(named: .init("LatchDefaultStore"))
    #endif

    override func intervalDidStart(for activity: DeviceActivityName) {
        super.intervalDidStart(for: activity)
        // Daily window started — clear any lingering shields and reset
        // counters for the new day.
        #if canImport(ManagedSettings)
        store.shield.applications = nil
        store.shield.applicationCategories = nil
        #endif
    }

    override func intervalDidEnd(for activity: DeviceActivityName) {
        super.intervalDidEnd(for: activity)
        // Daily window ended — extension wakes up briefly to clean state.
    }

    override func eventDidReachThreshold(_ event: DeviceActivityEvent.Name,
                                         activity: DeviceActivityName) {
        super.eventDidReachThreshold(event, activity: activity)

        // The user has hit a per-app daily limit — drop a shield in place.
        // The actual selection of apps to shield is read from the App-Group
        // UserDefaults the main app wrote when the rule was configured.
        #if canImport(ManagedSettings) && canImport(FamilyControls)
        // TODO: Decode the FamilyActivitySelection from the shared App
        // Group container and apply it to the store. Example:
        //
        //   let suite = UserDefaults(suiteName: "group.com.latch.app")
        //   if let data = suite?.data(forKey: "selection.\(event.rawValue)"),
        //      let selection = try? JSONDecoder().decode(FamilyActivitySelection.self, from: data) {
        //       store.shield.applications = selection.applicationTokens
        //   }
        #endif
    }

    override func intervalWillStartWarning(for activity: DeviceActivityName) {
        super.intervalWillStartWarning(for: activity)
    }

    override func intervalWillEndWarning(for activity: DeviceActivityName) {
        super.intervalWillEndWarning(for: activity)
        // Could fire a local notification: "5 minutes until your day resets."
    }

    override func eventWillReachThresholdWarning(_ event: DeviceActivityEvent.Name,
                                                 activity: DeviceActivityName) {
        super.eventWillReachThresholdWarning(event, activity: activity)
        // Could fire a local notification: "You're 5 minutes from your daily limit on Instagram."
    }
}

import SwiftUI

// MARK: - Latch
// Hooked on Real Life.
//
// Entry point for the Latch iOS app. Wires up the app-wide state object
// and the root navigation flow (onboarding -> dashboard).
//
// TODO (entitlements): Before this app can read or block screen time,
// you must enable in Xcode -> Signing & Capabilities:
//   - Family Controls
//   - DeviceActivity (via DeviceActivityMonitor extension target)
//   - ManagedSettings (via ManagedSettings + ShieldConfiguration extension)
//   - Push Notifications (optional; UserNotifications local works without)
//   - App Groups (e.g. group.com.latch.app) so the main app and the
//     DeviceActivity / Shield extensions can share state via UserDefaults.
//
// Family Controls additionally requires a special entitlement from Apple:
// https://developer.apple.com/contact/request/family-controls-distribution

@main
struct LatchApp: App {
    @StateObject private var appState = AppState()

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environmentObject(appState)
                .preferredColorScheme(.light)
                .task {
                    await appState.bootstrap()
                }
        }
    }
}

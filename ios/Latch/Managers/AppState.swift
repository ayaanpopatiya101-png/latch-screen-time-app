import Foundation
import SwiftUI

// MARK: - AppState
//
// Single source of truth shared via @EnvironmentObject. Persists onboarding
// data through UserDefaults so subsequent launches go straight to the
// dashboard. Real screen-time numbers come from `ScreenTimeManager`; we
// fall back to demo content until entitlements + authorization are granted.

@MainActor
final class AppState: ObservableObject {

    // Onboarding / profile
    @Published var onboarding = OnboardingData()
    @Published var hasOnboarded = false

    // Game state
    @Published var coins: Int = 60
    @Published var streakDays: Int = 3
    @Published var quests: [Quest] = DemoContent.quests
    @Published var offlineActions: [OfflineAction] = DemoContent.offlineActions
    @Published var rewards: [RewardItem] = DemoContent.rewards

    // Per-app rules (filled from ScreenTimeManager when authorized).
    @Published var appRules: [AppRule] = DemoContent.appRules

    // Permissions surfaced to the UI.
    @Published var screenTimeAuthorized = false
    @Published var notificationsAllowed = false

    // Bridge (delay-before-open) ephemeral state.
    @Published var pendingBridgeApp: AppRule?

    // Managers
    let screenTime = ScreenTimeManager()
    let notifications = NotificationManager()

    // MARK: Bootstrap
    func bootstrap() async {
        load()
        screenTimeAuthorized = await screenTime.currentAuthorizationStatus()
        notificationsAllowed = await notifications.currentAuthorizationStatus()
    }

    // MARK: Persistence
    private let defaults = UserDefaults.standard
    private enum Keys {
        static let onboarded = "latch.hasOnboarded"
        static let onboarding = "latch.onboarding"
        static let coins = "latch.coins"
        static let streak = "latch.streak"
    }

    func load() {
        hasOnboarded = defaults.bool(forKey: Keys.onboarded)
        if let data = defaults.data(forKey: Keys.onboarding),
           let decoded = try? JSONDecoder().decode(OnboardingData.self, from: data) {
            onboarding = decoded
        }
        if defaults.object(forKey: Keys.coins) != nil {
            coins = defaults.integer(forKey: Keys.coins)
        }
        if defaults.object(forKey: Keys.streak) != nil {
            streakDays = defaults.integer(forKey: Keys.streak)
        }
    }

    func save() {
        defaults.set(hasOnboarded, forKey: Keys.onboarded)
        if let data = try? JSONEncoder().encode(onboarding) {
            defaults.set(data, forKey: Keys.onboarding)
        }
        defaults.set(coins, forKey: Keys.coins)
        defaults.set(streakDays, forKey: Keys.streak)
    }

    // MARK: Permissions
    func requestScreenTime() async {
        let granted = await screenTime.requestAuthorization()
        screenTimeAuthorized = granted
        onboarding.screenTimeAuthorized = granted
        save()
    }

    func requestNotifications() async {
        let granted = await notifications.requestAuthorization()
        notificationsAllowed = granted
        onboarding.notificationsAllowed = granted
        save()
    }

    // MARK: Onboarding completion
    func completeOnboarding() {
        hasOnboarded = true
        save()
    }

    // MARK: Bridge flow
    func beginBridge(for rule: AppRule) {
        pendingBridgeApp = rule
    }

    func clearBridge() {
        pendingBridgeApp = nil
    }

    // MARK: Quests / coins
    func claim(_ quest: Quest) {
        guard let i = quests.firstIndex(of: quest), !quests[i].claimed,
              quests[i].progress >= quests[i].target else { return }
        quests[i].claimed = true
        coins += quests[i].reward
        save()
    }

    func purchase(_ reward: RewardItem) -> Bool {
        guard coins >= reward.cost else { return false }
        coins -= reward.cost
        save()
        return true
    }

    func logOfflineAction(_ action: OfflineAction) {
        let mid = (action.rewardLow + action.rewardHigh) / 2
        coins += mid
        save()
    }
}

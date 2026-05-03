import Foundation
import SwiftUI

// MARK: - Domain Models
//
// Mirrors the shape of the web prototype so the eventual native app feels
// familiar. Values are kept simple (Codable structs / plain enums) so they
// can be persisted in UserDefaults / a shared App Group container and
// consumed by extensions.

enum LatchMode: String, Codable, CaseIterable, Identifiable {
    case soft
    case focus
    case hard

    var id: String { rawValue }

    var title: String {
        switch self {
        case .soft:  return "Soft"
        case .focus: return "Focus"
        case .hard:  return "Hard"
        }
    }

    var blurb: String {
        switch self {
        case .soft:  return "Friendly nudges, easy to bypass."
        case .focus: return "Real friction. Bridge before opening."
        case .hard:  return "Strict block. Cooldowns enforced."
        }
    }
}

struct AppRule: Identifiable, Codable, Hashable {
    var id: String
    var name: String
    var category: String
    var openCount: Int
    var minutesToday: Int
    var delaySeconds: Int     // Bridge delay before unlocking.
    var dailyLimitMinutes: Int
    var mode: LatchMode
}

struct Quest: Identifiable, Codable, Hashable {
    var id: String
    var title: String
    var detail: String
    var progress: Int
    var target: Int
    var reward: Int           // Latch coins.
    var claimed: Bool
}

struct OfflineAction: Identifiable, Codable, Hashable {
    var id: String
    var title: String
    var minutes: Int
    var rewardLow: Int
    var rewardHigh: Int
    var swapFor: String       // e.g. "Instagram"
    var systemImage: String   // SF Symbol name.
}

struct RewardItem: Identifiable, Codable, Hashable {
    var id: String
    var title: String
    var cost: Int
    var detail: String
}

struct OnboardingData: Codable {
    var name: String = ""
    var age: String = ""
    var currentHours: Double = 5
    var goalHours: Double = 2
    var feelings: [String] = []
    var hardestTime: String = "Night"
    var topApps: [String] = ["Instagram"]
    var screenTimeAuthorized: Bool = false
    var notificationsAllowed: Bool = false
}

// MARK: - Demo content
//
// These let the UI render meaningfully on first launch / in previews. Real
// values will come from `ScreenTimeManager` once entitlements are granted.

enum DemoContent {
    static let appRules: [AppRule] = [
        AppRule(id: "ig",    name: "Instagram", category: "Social",       openCount: 38, minutesToday: 72, delaySeconds: 15, dailyLimitMinutes: 30, mode: .focus),
        AppRule(id: "tt",    name: "TikTok",    category: "Entertainment", openCount: 24, minutesToday: 95, delaySeconds: 20, dailyLimitMinutes: 25, mode: .hard),
        AppRule(id: "yt",    name: "YouTube",   category: "Entertainment", openCount: 11, minutesToday: 41, delaySeconds: 10, dailyLimitMinutes: 45, mode: .soft),
        AppRule(id: "x",     name: "X",         category: "Social",       openCount: 9,  minutesToday: 22, delaySeconds: 10, dailyLimitMinutes: 20, mode: .focus),
    ]

    static let quests: [Quest] = [
        Quest(id: "q1", title: "Morning Light",    detail: "No phone for 30 min after waking.", progress: 1, target: 1, reward: 20, claimed: false),
        Quest(id: "q2", title: "Bridge Five",      detail: "Use Bridge 5 times today.",         progress: 3, target: 5, reward: 30, claimed: false),
        Quest(id: "q3", title: "Walk it Off",      detail: "Swap a 10 min scroll for a walk.",  progress: 0, target: 1, reward: 25, claimed: false),
    ]

    static let offlineActions: [OfflineAction] = [
        OfflineAction(id: "walk",    title: "Take a walk",          minutes: 10, rewardLow: 10, rewardHigh: 25, swapFor: "Instagram", systemImage: "figure.walk"),
        OfflineAction(id: "stretch", title: "Stretch & breathe",    minutes: 5,  rewardLow: 5,  rewardHigh: 15, swapFor: "TikTok",    systemImage: "wind"),
        OfflineAction(id: "read",    title: "Read 1 chapter",       minutes: 15, rewardLow: 15, rewardHigh: 30, swapFor: "YouTube",   systemImage: "book"),
        OfflineAction(id: "call",    title: "Call someone you love", minutes: 8, rewardLow: 12, rewardHigh: 20, swapFor: "X",         systemImage: "phone"),
    ]

    static let rewards: [RewardItem] = [
        RewardItem(id: "skin1", title: "Sunrise Mascot Skin", cost: 80,  detail: "A warm new look for your Latch."),
        RewardItem(id: "boost", title: "Streak Freeze",       cost: 120, detail: "Protect a streak for one off-day."),
        RewardItem(id: "theme", title: "Forest Theme",        cost: 150, detail: "Soft greens across the app."),
    ]
}

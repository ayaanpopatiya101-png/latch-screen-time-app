import Foundation
import UserNotifications

// MARK: - NotificationManager
//
// Local notifications only — no APNs server required, so this works the
// instant the user accepts the iOS prompt. Used for streak nudges, "you're
// approaching your daily limit", and Bridge unlock alerts.

final class NotificationManager {

    private let center = UNUserNotificationCenter.current()

    func currentAuthorizationStatus() async -> Bool {
        let settings = await center.notificationSettings()
        return settings.authorizationStatus == .authorized
            || settings.authorizationStatus == .provisional
    }

    @discardableResult
    func requestAuthorization() async -> Bool {
        do {
            return try await center.requestAuthorization(
                options: [.alert, .badge, .sound]
            )
        } catch {
            print("Latch: notification authorization failed: \(error)")
            return false
        }
    }

    /// Fire a one-shot reminder N seconds from now.
    func scheduleReminder(title: String, body: String, after seconds: TimeInterval, id: String = UUID().uuidString) {
        let content = UNMutableNotificationContent()
        content.title = title
        content.body = body
        content.sound = .default

        let trigger = UNTimeIntervalNotificationTrigger(
            timeInterval: max(1, seconds),
            repeats: false
        )
        let request = UNNotificationRequest(identifier: id, content: content, trigger: trigger)
        center.add(request) { error in
            if let error { print("Latch: failed to schedule notification: \(error)") }
        }
    }

    /// Daily streak nudge at the user's "hardest time".
    func scheduleStreakNudge(hour: Int, minute: Int) {
        let content = UNMutableNotificationContent()
        content.title = "Latch — keep your streak"
        content.body = "Five minutes off-screen now is worth more than you think."
        content.sound = .default

        var components = DateComponents()
        components.hour = hour
        components.minute = minute
        let trigger = UNCalendarNotificationTrigger(dateMatching: components, repeats: true)
        let request = UNNotificationRequest(
            identifier: "latch.streak.nudge",
            content: content,
            trigger: trigger
        )
        center.add(request) { error in
            if let error { print("Latch: failed to schedule streak nudge: \(error)") }
        }
    }

    func cancelAll() {
        center.removeAllPendingNotificationRequests()
    }
}

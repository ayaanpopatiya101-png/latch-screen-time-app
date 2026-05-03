import SwiftUI

// MARK: - OnboardingView
//
// Mirrors the web prototype's intro flow:
//   1. Welcome / mascot
//   2. Name + age
//   3. Current screen-time (hours/day) and goal
//   4. Screen Time permission card  (Family Controls)
//   5. Notifications permission card
//   6. Plan summary -> dashboard

struct OnboardingView: View {
    @EnvironmentObject private var appState: AppState
    @State private var step: Int = 0

    private let totalSteps = 6

    var body: some View {
        VStack(spacing: 0) {
            // Progress
            ProgressView(value: Double(step + 1), total: Double(totalSteps))
                .tint(LatchTheme.accent)
                .padding(.horizontal)
                .padding(.top, 12)

            ScrollView {
                VStack(spacing: 20) {
                    switch step {
                    case 0: welcomeStep
                    case 1: nameStep
                    case 2: hoursStep
                    case 3: screenTimePermissionStep
                    case 4: notificationsPermissionStep
                    default: planStep
                    }
                }
                .padding(20)
            }

            // Navigation
            HStack {
                if step > 0 {
                    Button("Back") { step -= 1 }
                        .foregroundStyle(LatchTheme.inkSoft)
                }
                Spacer()
                Button(step == totalSteps - 1 ? "Start" : "Continue") {
                    advance()
                }
                .buttonStyle(LatchPrimaryButtonStyle())
                .disabled(!canAdvance)
            }
            .padding(20)
        }
    }

    private var canAdvance: Bool {
        switch step {
        case 1: return !appState.onboarding.name.trimmingCharacters(in: .whitespaces).isEmpty
        default: return true
        }
    }

    private func advance() {
        if step == totalSteps - 1 {
            appState.completeOnboarding()
        } else {
            step += 1
        }
    }

    // MARK: Steps

    private var welcomeStep: some View {
        VStack(spacing: 16) {
            Text("🪺")
                .font(.system(size: 88))
            Text("Hooked on Real Life.")
                .font(.title.bold())
                .foregroundStyle(LatchTheme.ink)
            Text("Latch uses the same psychology social media uses on you — to give you back your time.")
                .multilineTextAlignment(.center)
                .foregroundStyle(LatchTheme.inkSoft)
        }
        .padding(.top, 40)
    }

    private var nameStep: some View {
        LatchCard {
            Text("What should we call you?")
                .font(.title3.bold())
            TextField("Your name", text: $appState.onboarding.name)
                .textFieldStyle(.roundedBorder)
            Text("Age (optional)")
                .font(.caption)
                .foregroundStyle(LatchTheme.inkSoft)
            TextField("e.g. 22", text: $appState.onboarding.age)
                .keyboardType(.numberPad)
                .textFieldStyle(.roundedBorder)
        }
    }

    private var hoursStep: some View {
        LatchCard {
            Text("Where are you today?")
                .font(.title3.bold())
            VStack(alignment: .leading) {
                Text("Daily screen time: \(Int(appState.onboarding.currentHours)) h")
                Slider(value: $appState.onboarding.currentHours, in: 1...12, step: 1)
                    .tint(LatchTheme.accent)
            }
            VStack(alignment: .leading) {
                Text("Goal: \(Int(appState.onboarding.goalHours)) h")
                Slider(value: $appState.onboarding.goalHours, in: 0...8, step: 1)
                    .tint(LatchTheme.positive)
            }
            Text("We'll build a plan that meets you where you are.")
                .font(.caption)
                .foregroundStyle(LatchTheme.inkSoft)
        }
    }

    private var screenTimePermissionStep: some View {
        LatchCard {
            HStack(spacing: 12) {
                Image(systemName: "hourglass")
                    .font(.title)
                    .foregroundStyle(LatchTheme.accent)
                VStack(alignment: .leading) {
                    Text("Connect Screen Time").font(.title3.bold())
                    Text("Lets Latch read app opens and apply a Bridge before you scroll.")
                        .font(.footnote)
                        .foregroundStyle(LatchTheme.inkSoft)
                }
            }
            Button {
                Task { await appState.requestScreenTime() }
            } label: {
                HStack {
                    Image(systemName: appState.screenTimeAuthorized ? "checkmark.circle.fill" : "lock.shield")
                    Text(appState.screenTimeAuthorized ? "Connected" : "Allow Screen Time")
                }
            }
            .buttonStyle(LatchPrimaryButtonStyle())
            .disabled(appState.screenTimeAuthorized)

            Text("Requires the Family Controls entitlement on a real device. In the simulator without entitlements, this will fail gracefully and you can keep going with demo data.")
                .font(.caption2)
                .foregroundStyle(LatchTheme.inkSoft)
        }
    }

    private var notificationsPermissionStep: some View {
        LatchCard {
            HStack(spacing: 12) {
                Image(systemName: "bell.badge")
                    .font(.title)
                    .foregroundStyle(LatchTheme.accent)
                VStack(alignment: .leading) {
                    Text("Gentle nudges").font(.title3.bold())
                    Text("Streak reminders and Bridge unlock alerts.")
                        .font(.footnote)
                        .foregroundStyle(LatchTheme.inkSoft)
                }
            }
            Button {
                Task { await appState.requestNotifications() }
            } label: {
                HStack {
                    Image(systemName: appState.notificationsAllowed ? "checkmark.circle.fill" : "bell")
                    Text(appState.notificationsAllowed ? "Allowed" : "Allow notifications")
                }
            }
            .buttonStyle(LatchPrimaryButtonStyle())
            .disabled(appState.notificationsAllowed)
        }
    }

    private var planStep: some View {
        LatchCard {
            Text("Your starter plan")
                .font(.title3.bold())
            HStack {
                Text("Goal:")
                Spacer()
                Text("\(Int(appState.onboarding.goalHours)) h / day")
                    .foregroundStyle(LatchTheme.positive)
            }
            HStack {
                Text("Bridge delay:")
                Spacer()
                Text("15s before Instagram, TikTok")
            }
            HStack {
                Text("Daily quests:")
                Spacer()
                Text("3 per day")
            }
            Divider()
            Text("You can fine-tune everything later in the Shield page.")
                .font(.caption)
                .foregroundStyle(LatchTheme.inkSoft)
        }
    }
}

// MARK: - Buttons

struct LatchPrimaryButtonStyle: ButtonStyle {
    func makeBody(configuration: Configuration) -> some View {
        configuration.label
            .font(.headline)
            .foregroundStyle(.white)
            .padding(.horizontal, 18)
            .padding(.vertical, 12)
            .background(
                RoundedRectangle(cornerRadius: 14, style: .continuous)
                    .fill(LatchTheme.accent)
                    .opacity(configuration.isPressed ? 0.8 : 1)
            )
    }
}

#Preview {
    OnboardingView().environmentObject(AppState())
}

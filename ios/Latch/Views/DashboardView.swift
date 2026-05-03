import SwiftUI

// MARK: - DashboardView
//
// Tabbed shell mirroring the web prototype: Home (Bridge entry + quests),
// Shield (per-app rules), Swaps (offline actions), Shop (rewards), Focus
// placeholder. Most sub-screens are intentionally lightweight — they're
// wired up so the navigation feels real, with the heavier logic landing
// once Family Controls authorization is in place.

struct DashboardView: View {
    var body: some View {
        TabView {
            HomeTab()
                .tabItem { Label("Home", systemImage: "house") }
            ShieldTab()
                .tabItem { Label("Shield", systemImage: "shield") }
            SwapsTab()
                .tabItem { Label("Swaps", systemImage: "leaf") }
            ShopTab()
                .tabItem { Label("Shop", systemImage: "bag") }
            FocusTab()
                .tabItem { Label("Focus", systemImage: "moon.stars") }
        }
        .tint(LatchTheme.accent)
    }
}

// MARK: - Home

private struct HomeTab: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 16) {
                    headerCard
                    questsCard
                    appsCard
                }
                .padding(16)
            }
            .background(LatchTheme.background)
            .navigationTitle("Hi, \(appState.onboarding.name.isEmpty ? "friend" : appState.onboarding.name)")
        }
    }

    private var headerCard: some View {
        LatchCard {
            HStack(alignment: .top) {
                VStack(alignment: .leading, spacing: 4) {
                    Text("Streak")
                        .font(.caption)
                        .foregroundStyle(LatchTheme.inkSoft)
                    Text("\(appState.streakDays) days")
                        .font(.title.bold())
                }
                Spacer()
                VStack(alignment: .trailing, spacing: 4) {
                    Text("Coins")
                        .font(.caption)
                        .foregroundStyle(LatchTheme.inkSoft)
                    Text("🪙 \(appState.coins)")
                        .font(.title.bold())
                }
            }
            Divider()
            Text("Goal: \(Int(appState.onboarding.goalHours)) h/day · Today: 2h 24m")
                .font(.footnote)
                .foregroundStyle(LatchTheme.inkSoft)
        }
    }

    private var questsCard: some View {
        LatchCard {
            Text("Today's quests").font(.headline)
            ForEach(appState.quests) { quest in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(quest.title).font(.subheadline.bold())
                        Text(quest.detail)
                            .font(.caption)
                            .foregroundStyle(LatchTheme.inkSoft)
                        ProgressView(value: Double(quest.progress), total: Double(quest.target))
                            .tint(LatchTheme.positive)
                    }
                    Spacer(minLength: 12)
                    if quest.progress >= quest.target && !quest.claimed {
                        Button("Claim +\(quest.reward)") { appState.claim(quest) }
                            .buttonStyle(.borderedProminent)
                            .tint(LatchTheme.positive)
                    } else {
                        Text("+\(quest.reward)")
                            .font(.caption)
                            .foregroundStyle(LatchTheme.inkSoft)
                    }
                }
                .padding(.vertical, 6)
            }
        }
    }

    private var appsCard: some View {
        LatchCard {
            Text("Your apps").font(.headline)
            ForEach(appState.appRules) { rule in
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(rule.name).font(.subheadline.bold())
                        Text("\(rule.openCount) opens · \(rule.minutesToday)m today")
                            .font(.caption)
                            .foregroundStyle(LatchTheme.inkSoft)
                    }
                    Spacer()
                    Button("Bridge") { appState.beginBridge(for: rule) }
                        .buttonStyle(.bordered)
                        .tint(LatchTheme.accent)
                }
                .padding(.vertical, 6)
            }
        }
    }
}

// MARK: - Shield

private struct ShieldTab: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        NavigationStack {
            List {
                Section {
                    if !appState.screenTimeAuthorized {
                        Label("Screen Time isn't connected yet — limits below are demo values.",
                              systemImage: "exclamationmark.triangle")
                            .foregroundStyle(LatchTheme.warning)
                    }
                }
                ForEach($appState.appRules) { $rule in
                    NavigationLink(rule.name) {
                        AppRuleEditor(rule: $rule)
                    }
                }
            }
            .navigationTitle("Shield")
        }
    }
}

private struct AppRuleEditor: View {
    @Binding var rule: AppRule
    var body: some View {
        Form {
            Section("Mode") {
                Picker("Mode", selection: $rule.mode) {
                    ForEach(LatchMode.allCases) { Text($0.title).tag($0) }
                }
                .pickerStyle(.segmented)
                Text(rule.mode.blurb)
                    .font(.footnote)
                    .foregroundStyle(LatchTheme.inkSoft)
            }
            Section("Bridge delay (s)") {
                Stepper("\(rule.delaySeconds)s", value: $rule.delaySeconds, in: 0...60, step: 5)
            }
            Section("Daily limit (min)") {
                Stepper("\(rule.dailyLimitMinutes)m", value: $rule.dailyLimitMinutes, in: 0...240, step: 5)
            }
        }
        .navigationTitle(rule.name)
    }
}

// MARK: - Swaps

private struct SwapsTab: View {
    @EnvironmentObject private var appState: AppState
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    ForEach(appState.offlineActions) { action in
                        LatchCard {
                            HStack(spacing: 14) {
                                Image(systemName: action.systemImage)
                                    .font(.title2)
                                    .frame(width: 40, height: 40)
                                    .background(LatchTheme.accentSoft)
                                    .clipShape(Circle())
                                VStack(alignment: .leading) {
                                    Text(action.title).font(.subheadline.bold())
                                    Text("Swap for \(action.swapFor) · \(action.minutes) min")
                                        .font(.caption)
                                        .foregroundStyle(LatchTheme.inkSoft)
                                }
                                Spacer()
                                Button("Did it +\(action.rewardLow)–\(action.rewardHigh)") {
                                    appState.logOfflineAction(action)
                                }
                                .buttonStyle(.bordered)
                                .tint(LatchTheme.positive)
                            }
                        }
                    }
                }
                .padding(16)
            }
            .background(LatchTheme.background)
            .navigationTitle("Swaps")
        }
    }
}

// MARK: - Shop

private struct ShopTab: View {
    @EnvironmentObject private var appState: AppState
    @State private var alert: String?
    var body: some View {
        NavigationStack {
            ScrollView {
                VStack(spacing: 12) {
                    Text("🪙 \(appState.coins) coins")
                        .font(.title3.bold())
                        .frame(maxWidth: .infinity, alignment: .leading)

                    ForEach(appState.rewards) { reward in
                        LatchCard {
                            HStack {
                                VStack(alignment: .leading) {
                                    Text(reward.title).font(.subheadline.bold())
                                    Text(reward.detail)
                                        .font(.caption)
                                        .foregroundStyle(LatchTheme.inkSoft)
                                }
                                Spacer()
                                Button("Buy \(reward.cost)") {
                                    if !appState.purchase(reward) {
                                        alert = "Not enough coins yet."
                                    }
                                }
                                .buttonStyle(.borderedProminent)
                                .tint(LatchTheme.accent)
                                .disabled(appState.coins < reward.cost)
                            }
                        }
                    }
                }
                .padding(16)
            }
            .background(LatchTheme.background)
            .navigationTitle("Shop")
            .alert("Heads up", isPresented: .init(get: { alert != nil }, set: { if !$0 { alert = nil } })) {
                Button("OK") { alert = nil }
            } message: {
                Text(alert ?? "")
            }
        }
    }
}

// MARK: - Focus

private struct FocusTab: View {
    var body: some View {
        NavigationStack {
            VStack(spacing: 16) {
                Image(systemName: "moon.stars")
                    .font(.system(size: 60))
                    .foregroundStyle(LatchTheme.accent)
                Text("Focus mode is coming soon.")
                    .font(.title3.bold())
                Text("Schedule deep-work blocks where Latch hard-shields chosen apps until your timer ends.")
                    .multilineTextAlignment(.center)
                    .foregroundStyle(LatchTheme.inkSoft)
                    .padding(.horizontal, 24)
            }
            .frame(maxWidth: .infinity, maxHeight: .infinity)
            .background(LatchTheme.background)
            .navigationTitle("Focus")
        }
    }
}

#Preview {
    DashboardView().environmentObject(AppState())
}

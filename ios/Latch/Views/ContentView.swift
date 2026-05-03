import SwiftUI

// MARK: - ContentView
//
// Root switcher: shows OnboardingView until the user finishes the intro
// flow, then hands off to DashboardView. Re-renders automatically when
// AppState publishes a change.

struct ContentView: View {
    @EnvironmentObject private var appState: AppState

    var body: some View {
        ZStack {
            LatchTheme.background.ignoresSafeArea()
            if appState.hasOnboarded {
                DashboardView()
                    .transition(.opacity)
            } else {
                OnboardingView()
                    .transition(.opacity)
            }
        }
        .animation(.easeInOut(duration: 0.25), value: appState.hasOnboarded)
        .sheet(item: $appState.pendingBridgeApp) { rule in
            BridgeView(rule: rule)
                .environmentObject(appState)
                .interactiveDismissDisabled()
        }
    }
}

// MARK: - Theme

enum LatchTheme {
    static let background     = Color(red: 0.97, green: 0.96, blue: 0.93) // warm off-white
    static let accent         = Color(red: 0.91, green: 0.45, blue: 0.27) // sunrise orange
    static let accentSoft     = Color(red: 0.99, green: 0.86, blue: 0.78)
    static let ink            = Color(red: 0.13, green: 0.12, blue: 0.16)
    static let inkSoft        = Color(red: 0.36, green: 0.34, blue: 0.38)
    static let card           = Color.white
    static let positive       = Color(red: 0.30, green: 0.70, blue: 0.45)
    static let warning        = Color(red: 0.94, green: 0.66, blue: 0.18)
}

// MARK: - Reusable card

struct LatchCard<Content: View>: View {
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) { content }
            .padding(16)
            .background(LatchTheme.card)
            .clipShape(RoundedRectangle(cornerRadius: 18, style: .continuous))
            .shadow(color: .black.opacity(0.05), radius: 12, y: 4)
    }
}

#Preview {
    ContentView().environmentObject(AppState())
}

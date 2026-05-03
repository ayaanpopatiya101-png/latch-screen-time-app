import SwiftUI

// MARK: - BridgeView
//
// The "pause before scrolling" friction screen. The app counts down for
// `rule.delaySeconds`, shows a small reflection prompt, and only then
// allows the user to either continue or close.
//
// On a fully-entitled build, this same view is rendered from the
// ShieldConfiguration extension when the user taps a shielded app from the
// home screen — so keep it self-contained and dependency-light.

struct BridgeView: View {
    let rule: AppRule
    @EnvironmentObject private var appState: AppState
    @Environment(\.dismiss) private var dismiss

    @State private var remaining: Int
    @State private var timer: Timer?

    init(rule: AppRule) {
        self.rule = rule
        _remaining = State(initialValue: max(rule.delaySeconds, 5))
    }

    var body: some View {
        VStack(spacing: 24) {
            Spacer()

            Text("Bridge")
                .font(.caption.bold())
                .foregroundStyle(LatchTheme.inkSoft)
                .tracking(2)

            Text(rule.name)
                .font(.largeTitle.bold())
                .foregroundStyle(LatchTheme.ink)

            ZStack {
                Circle()
                    .stroke(LatchTheme.accentSoft, lineWidth: 12)
                Circle()
                    .trim(from: 0, to: progress)
                    .stroke(LatchTheme.accent, style: StrokeStyle(lineWidth: 12, lineCap: .round))
                    .rotationEffect(.degrees(-90))
                    .animation(.linear(duration: 0.5), value: progress)
                Text("\(remaining)")
                    .font(.system(size: 56, weight: .bold, design: .rounded))
                    .foregroundStyle(LatchTheme.ink)
            }
            .frame(width: 220, height: 220)

            Text("Take a breath. Why are you opening \(rule.name)?")
                .multilineTextAlignment(.center)
                .foregroundStyle(LatchTheme.inkSoft)
                .padding(.horizontal, 32)

            Spacer()

            VStack(spacing: 10) {
                Button {
                    appState.clearBridge()
                    dismiss()
                } label: {
                    Text(remaining > 0 ? "Continue (\(remaining)s)" : "Continue to \(rule.name)")
                        .frame(maxWidth: .infinity)
                }
                .buttonStyle(LatchPrimaryButtonStyle())
                .disabled(remaining > 0)

                Button("Close — I'll skip it") {
                    appState.clearBridge()
                    dismiss()
                }
                .foregroundStyle(LatchTheme.inkSoft)
            }
            .padding(.horizontal, 24)
            .padding(.bottom, 24)
        }
        .background(LatchTheme.background.ignoresSafeArea())
        .onAppear { startTimer() }
        .onDisappear { timer?.invalidate() }
    }

    private var progress: CGFloat {
        let total = max(rule.delaySeconds, 5)
        return CGFloat(total - remaining) / CGFloat(total)
    }

    private func startTimer() {
        timer?.invalidate()
        timer = Timer.scheduledTimer(withTimeInterval: 1.0, repeats: true) { t in
            DispatchQueue.main.async {
                if remaining > 0 {
                    remaining -= 1
                } else {
                    t.invalidate()
                }
            }
        }
    }
}

#Preview {
    BridgeView(rule: DemoContent.appRules[0])
        .environmentObject(AppState())
}

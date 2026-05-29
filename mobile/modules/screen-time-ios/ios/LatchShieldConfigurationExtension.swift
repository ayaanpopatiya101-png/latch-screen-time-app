import ManagedSettingsUI
import ManagedSettings
import SwiftUI
import Foundation

/// ShieldConfiguration extension — renders the Latch-branded overlay that
/// appears when the user opens a shielded app.
///
/// Xcode setup required (see NATIVE_SETUP.md):
///   1. Add a new target: File › New › Target › Shield Configuration Extension
///   2. Name it LatchShieldConfiguration
///   3. Replace ShieldConfigurationExtension.swift with this file
///   4. Set the App Group to group.com.latch.screentime in Signing & Capabilities
class LatchShieldConfigurationExtension: ShieldConfigurationDataSource {

  private let defaults = UserDefaults(suiteName: "group.com.latch.screentime")

  override func configuration(shielding application: Application) -> ShieldConfiguration {
    let mode = defaults?.string(forKey: "latch_shield_mode") ?? "gentle"
    return makeConfig(mode: mode, appName: application.localizedDisplayName ?? "this app")
  }

  override func configuration(shielding applicationCategory: ApplicationCategory) -> ShieldConfiguration {
    let mode = defaults?.string(forKey: "latch_shield_mode") ?? "gentle"
    return makeConfig(mode: mode, appName: applicationCategory.localizedDisplayName ?? "this category")
  }

  private func makeConfig(mode: String, appName: String) -> ShieldConfiguration {
    switch mode {
    case "deep-lock":
      return ShieldConfiguration(
        backgroundBlurStyle: .dark,
        backgroundColor: UIColor(red: 0.09, green: 0.08, blue: 0.07, alpha: 1),
        icon: UIImage(named: "lumi-shield-dark"),
        title: ShieldConfiguration.Label(text: "Deep Lock active", color: .white),
        subtitle: ShieldConfiguration.Label(
          text: "\(appName) is locked. Complete your focus window to earn an unlock.",
          color: UIColor(white: 0.75, alpha: 1)
        ),
        primaryButtonLabel: ShieldConfiguration.Label(text: "Open Latch", color: .white),
        primaryButtonBackgroundColor: UIColor(red: 0.31, green: 0.60, blue: 0.64, alpha: 1)
      )
    case "friction":
      return ShieldConfiguration(
        backgroundBlurStyle: .systemMaterial,
        icon: UIImage(named: "lumi-shield-light"),
        title: ShieldConfiguration.Label(text: "Heads up!", color: .label),
        subtitle: ShieldConfiguration.Label(
          text: "You set a friction block on \(appName). Tap \"Open Latch\" to spend credits or wait.",
          color: .secondaryLabel
        ),
        primaryButtonLabel: ShieldConfiguration.Label(text: "Open Latch", color: .white),
        primaryButtonBackgroundColor: UIColor(red: 0.31, green: 0.60, blue: 0.64, alpha: 1)
      )
    default: // gentle
      return ShieldConfiguration(
        backgroundBlurStyle: .systemUltraThinMaterial,
        icon: UIImage(named: "lumi-shield-light"),
        title: ShieldConfiguration.Label(text: "Gentle reminder", color: .label),
        subtitle: ShieldConfiguration.Label(
          text: "Lumi suggests a quick break from \(appName). Continue or check your plan.",
          color: .secondaryLabel
        ),
        primaryButtonLabel: ShieldConfiguration.Label(text: "Continue anyway", color: .white),
        primaryButtonBackgroundColor: UIColor(red: 0.5, green: 0.5, blue: 0.5, alpha: 0.8)
      )
    }
  }
}

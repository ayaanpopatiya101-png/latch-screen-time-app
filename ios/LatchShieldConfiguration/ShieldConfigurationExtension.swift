import Foundation
import UIKit

#if canImport(ManagedSettings)
import ManagedSettings
#endif
#if canImport(ManagedSettingsUI)
import ManagedSettingsUI
#endif

// MARK: - LatchShieldConfiguration
//
// This file belongs to a *separate* extension target — typically named
// `LatchShieldConfiguration` — created in Xcode via:
//   File -> New -> Target… -> Shield Configuration Extension
//
// The extension is asked by the system to describe how a shielded app
// should look from the home screen / when the user taps it. We brand it
// with the Latch palette and a "Bridge" call-to-action, then return
// control to the system. The actual Bridge timer in the main app runs
// only after the user re-opens Latch from this prompt.
//
// Required entitlements on this target:
//   - com.apple.developer.family-controls
//   - App Group matching the main app (e.g. group.com.latch.app)

#if canImport(ManagedSettingsUI)
@available(iOS 16.0, *)
final class LatchShieldConfiguration: ShieldConfigurationDataSource {

    private let palette = (
        background: UIColor(red: 0.97, green: 0.96, blue: 0.93, alpha: 1.0),
        accent:     UIColor(red: 0.91, green: 0.45, blue: 0.27, alpha: 1.0),
        ink:        UIColor(red: 0.13, green: 0.12, blue: 0.16, alpha: 1.0)
    )

    override func configuration(shielding application: Application) -> ShieldConfiguration {
        ShieldConfiguration(
            backgroundBlurStyle: .systemMaterial,
            backgroundColor: palette.background,
            icon: nil,
            title: ShieldConfiguration.Label(text: "Latch", color: palette.ink),
            subtitle: ShieldConfiguration.Label(
                text: "Hooked on Real Life — take a breath before you open this.",
                color: palette.ink
            ),
            primaryButtonLabel: ShieldConfiguration.Label(text: "Bridge", color: .white),
            primaryButtonBackgroundColor: palette.accent,
            secondaryButtonLabel: ShieldConfiguration.Label(text: "Close", color: palette.ink)
        )
    }

    override func configuration(shielding application: Application,
                                in category: ActivityCategory) -> ShieldConfiguration {
        configuration(shielding: application)
    }

    override func configuration(shielding webDomain: WebDomain) -> ShieldConfiguration {
        ShieldConfiguration(
            backgroundBlurStyle: .systemMaterial,
            backgroundColor: palette.background,
            icon: nil,
            title: ShieldConfiguration.Label(text: "Latch", color: palette.ink),
            subtitle: ShieldConfiguration.Label(
                text: "Pause before you open \(webDomain.domain ?? "this site").",
                color: palette.ink
            ),
            primaryButtonLabel: ShieldConfiguration.Label(text: "Bridge", color: .white),
            primaryButtonBackgroundColor: palette.accent,
            secondaryButtonLabel: ShieldConfiguration.Label(text: "Close", color: palette.ink)
        )
    }

    override func configuration(shielding webDomain: WebDomain,
                                in category: ActivityCategory) -> ShieldConfiguration {
        configuration(shielding: webDomain)
    }
}
#endif

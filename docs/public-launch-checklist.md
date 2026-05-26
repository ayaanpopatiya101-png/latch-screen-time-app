# Public launch checklist

A boring, complete checklist. If a row is unchecked, do not press "Submit for Review".

## Legal / privacy

- [ ] `docs/privacy-policy.md` hosted at the URL referenced in App Store Connect and Play Console
- [ ] Account deletion URL live and functional: `https://latch.app/delete-account`
- [ ] In-app deletion path works (Settings → Account → Delete)
- [ ] Privacy policy URL appears in app at Settings → Privacy policy
- [ ] DPA signed with each sub-processor (auth provider, crash reporter, FCM, etc.)

## Apple

- [ ] Apple Developer account active, payment current
- [ ] Bundle id `com.latch.screentime` created and approved
- [ ] `com.apple.developer.family-controls` entitlement granted (`docs/apple-family-controls-entitlement-request.md`)
- [ ] App Store Connect app record created with name "Latch — Screen-time coaching"
- [ ] Age rating set (4+ assumed; revisit if mood-logging UX changes)
- [ ] App Privacy answers filled per `docs/app-privacy-notes.md`
- [ ] Demo credentials for App Review entered (mirror `store/apple-listing.md`)
- [ ] Screenshots uploaded for iPhone 6.7", 6.5", 5.5" sizes (Apple required set)
- [ ] App preview video (optional but boosts conversion)
- [ ] Production build uploaded via EAS (`eas submit --platform ios --profile production`)
- [ ] Build accepted by ASC processing
- [ ] TestFlight internal testers added (team + advisors)
- [ ] External TestFlight group "Latch beta" created and invited
- [ ] App Review submitted; reply within Apple's window if they ask for changes

## Google

- [ ] Google Play Console account active, payment current
- [ ] Package `com.latch.screentime` reserved
- [ ] Data Safety form filled per `docs/data-safety-notes.md`
- [ ] App content rating questionnaire completed (likely Everyone)
- [ ] Accessibility usage disclosure submitted (and re-submitted after every change to the AccessibilityService)
- [ ] Permissions justified, especially `QUERY_ALL_PACKAGES`
- [ ] Production AAB uploaded via EAS (`eas submit --platform android --profile production`)
- [ ] Internal testing track created with at least one tester
- [ ] Closed testing track set up (Latch beta cohort)
- [ ] Production release prepared but not rolled out until App Review (Google) approves

## App content

- [ ] Real icon, splash, and adaptive-icon in `mobile/src/assets/` (no placeholder PNGs)
- [ ] App Store screenshots reflect production palette and copy
- [ ] Lumi's tone in copy reviewed for warmth + clarity
- [ ] Subscription / pricing copy (if any) reviewed by legal
- [ ] Empty states + error states do not crash; QA recorded with screenshots

## Technical readiness

- [ ] Crash-free rate ≥ 99% across the last week of TestFlight builds
- [ ] CI green on `master` (`.github/workflows/web-ci.yml`, `mobile-ci.yml`)
- [ ] Sentry / equivalent ingesting from both iOS and Android builds
- [ ] Analytics gated behind explicit opt-in; verified in TestFlight build
- [ ] App version + build numbers bumped (`mobile/app.json` `expo.version` and EAS auto-increment)

## Support readiness

- [ ] support@latch.app inbox monitored
- [ ] Public status page or "service health" page if you have a sync backend
- [ ] FAQ covering: "Latch doesn't seem to block apps" (permissions check), "I can't delete my account" (in-app + deletion URL), "My credit balance disappeared" (sync reset)

## Day-of-launch

- [ ] Production rollout to App Store: phased at 1% → 10% → 50% → 100% over 3 days
- [ ] Production rollout on Play: same phased schedule
- [ ] Post-launch monitoring window: 48 hours with on-call coverage
- [ ] Rollback plan: previous build still available in TestFlight / closed testing, ready to promote if a critical bug ships

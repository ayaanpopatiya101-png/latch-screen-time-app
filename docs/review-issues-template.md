# Review issues template

Apple and Google reviewers reject builds with terse, generic messages. Treat each rejection as a small project: log it here, draft the response, ship the fix.

## Template

Copy this block for each rejection.

```
## [APP / PLAY] [DATE] Build ##.##.##

**Reviewer message (verbatim):**
> ...paste here...

**Guideline / policy cited:** App Store Review Guideline X.Y / Play Policy "..."

**Our reading:** what the reviewer is actually concerned about, in plain English.

**Action plan:**
- [ ] Code change (file + 1-line description)
- [ ] Copy change
- [ ] Documentation change
- [ ] Resubmit with new build number ##.##.##

**Reply to reviewer (≤ 6 sentences):**
> ...

**Resolved:** YYYY-MM-DD by <name>
```

## Common rejection categories and pre-canned plans

### "Your app uses the Family Controls entitlement without a clear justification"

- Re-read `docs/apple-family-controls-entitlement-request.md` and lift the user-benefit paragraph into the App Review notes.
- Attach a 30-second screen recording of the focus-window flow.
- Confirm in your reply: Latch is single-user, self-imposed, no parental supervision.

### "Your app's privacy policy does not match the data you declare"

- Compare `App Privacy` answers with `docs/app-privacy-notes.md` and the live policy at `https://latch.app/privacy`.
- Update whichever one is stale. The most common drift is forgetting to declare "Diagnostics → Crash data" when you added Sentry.

### "Your Accessibility Service does not have an in-app disclosure" (Play)

- Add a one-screen onboarding card explaining: "Latch uses the Accessibility Service only to detect the foreground app's package name during a focus window. We never read screen content, input, or text."
- Update `docs/data-safety-notes.md` if the disclosure wording changes.

### "Your `QUERY_ALL_PACKAGES` use is not justified" (Play)

- Reply that Latch needs the full app list to present the per-app shield picker; without it, the picker is empty or shows only system apps.
- Attach a screenshot of the picker.

### "Your app crashes on launch when [permission] is denied"

- Reproduce the crash on a real device matching the reviewer's model + OS.
- Add a fallback path: insights-only mode when permissions are missing.
- Add a regression test to `docs/real-device-test-plan.md` (Section B).

### "Demo credentials don't work"

- Re-verify the credentials in `store/apple-listing.md` / `store/google-play-listing.md`.
- If you rotate creds, update both files _and_ the App Review notes _and_ the entitlement form.

## Tracking

Keep this file in version control. One markdown block per rejection. When a build is finally approved, add a `## APPROVED YYYY-MM-DD Build ##.##.##` line and move on.

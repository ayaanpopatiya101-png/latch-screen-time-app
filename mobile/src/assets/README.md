# Mobile assets

Replace these placeholder files with production artwork before submitting builds:

- `icon.png` — 1024×1024 app icon (no transparency, no rounded corners; iOS adds them)
- `splash.png` — 1242×2436 (or larger) launch image, centered logo on cream background `#F6EFE2`
- `adaptive-icon.png` — Android adaptive icon foreground, 1024×1024 with safe area

The Expo CLI will fail to bundle if these are missing — use any cream-background placeholder for first dev builds, then ship real artwork before TestFlight / Play.

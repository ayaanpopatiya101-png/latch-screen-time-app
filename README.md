# Latch — *Hooked on Real Life.*

Latch uses the same psychology social media uses on you — to give you
back your time. Friction-before-scroll, daily quests, and offline swaps,
all wrapped in a warm, mascot-led UI.

This repository contains two parts:

| Folder | What it is | Status |
| --- | --- | --- |
| [`client/`](./client) (+ `server/`, `shared/`) | **Web prototype** — React + Vite + TypeScript. Demonstrates the flow and feel. | ✅ Runs in any browser |
| [`ios/`](./ios) | **Native iOS scaffold** — SwiftUI starter targeting iOS 16+ with FamilyControls / DeviceActivity / ManagedSettings. | 🛠 Source only — open in Xcode on a Mac to build |

## Web prototype vs native iOS app

The web prototype is fully clickable but **cannot read or block real
screen time** — the browser has no access to Apple's Screen Time
frameworks. It's there to show what Latch feels like and to validate
the UX.

The native iOS app in [`ios/`](./ios) is what eventually ships to the App
Store. It needs:

- An Apple Developer Program membership ($99/yr).
- A Mac with Xcode.
- Apple's Family Controls distribution entitlement (request from Apple).

See [`ios/README.md`](./ios/README.md) for the full setup guide,
required capabilities, and App Store launch checklist.

## Run the web prototype

```bash
npm install
npm run dev
```

Then open the URL printed by Vite.

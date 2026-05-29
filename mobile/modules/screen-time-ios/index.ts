/**
 * JS entry point for the screen-time-ios Expo local module.
 *
 * In a prebuild binary this re-exports the native module.
 * In Expo Go (where native modules are unavailable) it re-exports
 * the mock so the app still runs.
 */
import { NativeModules, Platform } from 'react-native';

const LINKING_ERROR =
  `The package 'screen-time-ios' doesn't seem to be linked. ` +
  `Make sure you ran 'npx expo prebuild' and rebuilt the app.`;

// The native module is registered as 'ScreenTimeIOS' from Swift.
const Native: NativeScreenTimeIOS | null =
  Platform.OS === 'ios'
    ? NativeModules.ScreenTimeIOS ?? null
    : null;

export interface NativeScreenTimeIOS {
  /** Ask for FamilyControls individual authorization. Resolves 'granted' | 'denied'. */
  requestAuthorization(): Promise<'granted' | 'denied'>;
  /** Returns current authorization state: 'granted' | 'denied' | 'not-determined'. */
  getAuthorizationStatus(): Promise<'granted' | 'denied' | 'not-determined'>;
  /**
   * Returns today's per-app usage in minutes.
   * Each entry: { bundleId: string; displayName: string; minutesToday: number; category: string }
   * Note: Apple returns opaque tokens, NOT bundle IDs. The Swift layer resolves
   * displayName via FamilyActivitySelection and returns 'com.apple.token.<hash>' as bundleId.
   */
  getTodayUsage(): Promise<Array<{ bundleId: string; displayName: string; minutesToday: number; category: string }>>;
  /**
   * Apply a ManagedSettingsStore shield.
   * bundleIds: opaque token strings returned from getTodayUsage.
   * mode: 'gentle' | 'friction' | 'deep-lock'
   */
  startShield(bundleIds: string[], mode: string, endsAt?: number): Promise<{ ok: boolean; reason?: string }>;
  /** Clear the ManagedSettingsStore shield. */
  stopShield(): Promise<{ ok: boolean }>;
  /**
   * Schedule a DeviceActivity window.
   * activityName: stable string key (stored in UserDefaults App Group).
   * startHour/startMinute: local time the window begins.
   * endHour/endMinute: local time the window ends.
   * bundleIds: opaque tokens to block during the window.
   */
  scheduleActivity(
    activityName: string,
    startHour: number,
    startMinute: number,
    endHour: number,
    endMinute: number,
    bundleIds: string[],
  ): Promise<{ ok: boolean }>;
  /** Cancel a previously scheduled DeviceActivity window. */
  cancelActivity(activityName: string): Promise<{ ok: boolean }>;
}

export default Native;

/**
 * JS entry point for the screen-time-android Expo local module.
 *
 * In a prebuild binary this re-exports the native module registered
 * by ScreenTimeAndroidModule.kt as 'ScreenTimeAndroid'.
 * In Expo Go (where native modules are unavailable) it returns null
 * so the service falls back to the mock.
 */
import { NativeModules, Platform } from 'react-native';

const Native: NativeScreenTimeAndroid | null =
  Platform.OS === 'android'
    ? NativeModules.ScreenTimeAndroid ?? null
    : null;

export interface NativeScreenTimeAndroid {
  /** Returns 'granted' | 'denied' for PACKAGE_USAGE_STATS. */
  getUsageAccessStatus(): Promise<'granted' | 'denied'>;
  /** Opens Settings.ACTION_USAGE_ACCESS_SETTINGS. Returns after the user comes back. */
  requestUsageAccess(): Promise<'granted' | 'denied'>;
  /** Returns 'granted' | 'denied' for the LatchAccessibilityService. */
  getAccessibilityStatus(): Promise<'granted' | 'denied'>;
  /** Opens Settings → Accessibility page. Returns after the user comes back. */
  requestAccessibility(): Promise<'granted' | 'denied'>;
  /**
   * Query today's per-app usage via UsageStatsManager.
   * Returns array of { bundleId, displayName, minutesToday, category }
   */
  getTodayUsage(): Promise<Array<{ bundleId: string; displayName: string; minutesToday: number; category: string }>>;
  /**
   * Start LatchShieldService (foreground service) and register shielded packages
   * with LatchAccessibilityService.
   */
  startShield(packageNames: string[], mode: string, endsAtMs: number): Promise<{ ok: boolean; reason?: string }>;
  /** Stop the shield foreground service. */
  stopShield(): Promise<{ ok: boolean }>;
}

export default Native;

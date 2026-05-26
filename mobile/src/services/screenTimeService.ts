import { Platform } from 'react-native';
import { AppUsage } from '@/types';

/**
 * Abstraction over OS-level screen-time APIs.
 *
 * iOS production implementation: backed by the FamilyControls, DeviceActivity
 * and ManagedSettings frameworks via a custom Expo native module. Requires the
 * `com.apple.developer.family-controls` entitlement which Apple grants on
 * application (see docs/apple-family-controls-entitlement-request.md).
 *
 * Android production implementation: backed by UsageStatsManager (for usage
 * data, requires PACKAGE_USAGE_STATS via Settings.ACTION_USAGE_ACCESS_SETTINGS)
 * and an AccessibilityService (for app blocking, requires the user to enable
 * the service in Settings).
 *
 * This file ships a mock implementation that returns plausible demo data so
 * the prototype runs end-to-end without native code. Replace with a thin
 * wrapper around the native modules during prebuild integration.
 */
export interface ScreenTimePermissions {
  iosFamilyControls: 'granted' | 'denied' | 'not-determined' | 'unavailable';
  androidUsageAccess: 'granted' | 'denied' | 'unavailable';
  androidAccessibility: 'granted' | 'denied' | 'unavailable';
  notifications: 'granted' | 'denied' | 'not-determined';
}

export interface ShieldConfig {
  blockedBundleIds: string[];
  mode: 'gentle' | 'friction' | 'deep-lock';
  startsAt?: number;
  endsAt?: number;
}

export interface ScreenTimeService {
  isProduction: boolean;
  getPermissions(): Promise<ScreenTimePermissions>;
  requestPermission(
    key: 'iosFamilyControls' | 'androidUsageAccess' | 'androidAccessibility' | 'notifications',
  ): Promise<'granted' | 'denied' | 'unavailable'>;
  getTodayUsage(): Promise<AppUsage[]>;
  startShield(config: ShieldConfig): Promise<{ ok: boolean; reason?: string }>;
  stopShield(): Promise<{ ok: boolean }>;
}

const mockUsage: AppUsage[] = [
  { bundleId: 'com.zhiliaoapp.musically', displayName: 'TikTok', minutesToday: 74, category: 'video' },
  { bundleId: 'com.burbn.instagram', displayName: 'Instagram', minutesToday: 52, category: 'social' },
  { bundleId: 'com.atebits.Tweetie2', displayName: 'X', minutesToday: 18, category: 'social' },
  { bundleId: 'com.google.ios.youtube', displayName: 'YouTube', minutesToday: 41, category: 'video' },
  { bundleId: 'com.apple.MobileSMS', displayName: 'Messages', minutesToday: 22, category: 'other' },
  { bundleId: 'com.tinyspeck.chatlyio', displayName: 'Slack', minutesToday: 11, category: 'productivity' },
];

class MockScreenTimeService implements ScreenTimeService {
  isProduction = false;
  private perms: ScreenTimePermissions = {
    iosFamilyControls: Platform.OS === 'ios' ? 'not-determined' : 'unavailable',
    androidUsageAccess: Platform.OS === 'android' ? 'denied' : 'unavailable',
    androidAccessibility: Platform.OS === 'android' ? 'denied' : 'unavailable',
    notifications: 'not-determined',
  };

  async getPermissions() {
    return { ...this.perms };
  }

  async requestPermission(key: keyof ScreenTimePermissions) {
    if (this.perms[key] === 'unavailable') return 'unavailable';
    // Simulate user accepting in 90% of cases for the prototype.
    const granted = Math.random() < 0.9;
    const next: 'granted' | 'denied' = granted ? 'granted' : 'denied';
    this.perms = { ...this.perms, [key]: next };
    return next;
  }

  async getTodayUsage() {
    return mockUsage.map((u) => ({ ...u }));
  }

  async startShield(_config: ShieldConfig) {
    if (this.perms.iosFamilyControls !== 'granted' && this.perms.androidAccessibility !== 'granted') {
      return { ok: false, reason: 'native-permission-required' };
    }
    return { ok: true };
  }

  async stopShield() {
    return { ok: true };
  }
}

let instance: ScreenTimeService | null = null;
export function getScreenTimeService(): ScreenTimeService {
  if (!instance) instance = new MockScreenTimeService();
  return instance;
}

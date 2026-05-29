import { Platform } from 'react-native';
import { AppUsage } from '@/types';
import type { NativeScreenTimeIOS } from '../../modules/screen-time-ios';
import type { NativeScreenTimeAndroid } from '../../modules/screen-time-android';

/**
 * Abstraction over OS-level screen-time APIs.
 *
 * Runtime behaviour:
 *  - In a prebuild binary with native modules linked:
 *      iOS     → wraps NativeModules.ScreenTimeIOS (FamilyControls / DeviceActivity / ManagedSettings)
 *      Android → wraps NativeModules.ScreenTimeAndroid (UsageStatsManager / AccessibilityService)
 *  - In Expo Go (or any build without the native module) → falls back to MockScreenTimeService
 *    so the prototype continues to run end-to-end.
 *
 * See docs/ios-native-plan.md and docs/android-native-plan.md for full context.
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
  /** true when backed by real OS APIs; false for mock. */
  isProduction: boolean;
  getPermissions(): Promise<ScreenTimePermissions>;
  requestPermission(
    key: 'iosFamilyControls' | 'androidUsageAccess' | 'androidAccessibility' | 'notifications',
  ): Promise<'granted' | 'denied' | 'unavailable'>;
  getTodayUsage(): Promise<AppUsage[]>;
  startShield(config: ShieldConfig): Promise<{ ok: boolean; reason?: string }>;
  stopShield(): Promise<{ ok: boolean }>;
}

// ---------------------------------------------------------------------------
// iOS native implementation
// ---------------------------------------------------------------------------

class IOSScreenTimeService implements ScreenTimeService {
  isProduction = true;

  private get native(): NativeScreenTimeIOS {
    // Dynamic import at call-time so the module does not throw at import if
    // the binary is Expo Go.
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../modules/screen-time-ios').default;
    if (!mod) throw new Error('ScreenTimeIOS native module not available');
    return mod;
  }

  async getPermissions(): Promise<ScreenTimePermissions> {
    const status = await this.native.getAuthorizationStatus();
    return {
      iosFamilyControls: status,
      androidUsageAccess: 'unavailable',
      androidAccessibility: 'unavailable',
      notifications: 'not-determined',
    };
  }

  async requestPermission(
    key: 'iosFamilyControls' | 'androidUsageAccess' | 'androidAccessibility' | 'notifications',
  ): Promise<'granted' | 'denied' | 'unavailable'> {
    if (key === 'iosFamilyControls') {
      return this.native.requestAuthorization();
    }
    if (key === 'notifications') {
      // Expo Notifications handles this — return current system state.
      return 'not-determined' as any;
    }
    return 'unavailable';
  }

  async getTodayUsage(): Promise<AppUsage[]> {
    const raw = await this.native.getTodayUsage();
    return raw.map((r) => ({
      bundleId: r.bundleId,
      displayName: r.displayName,
      minutesToday: r.minutesToday,
      category: (r.category as AppUsage['category']) ?? 'other',
    }));
  }

  async startShield(config: ShieldConfig): Promise<{ ok: boolean; reason?: string }> {
    return this.native.startShield(
      config.blockedBundleIds,
      config.mode,
      config.endsAt,
    );
  }

  async stopShield(): Promise<{ ok: boolean }> {
    return this.native.stopShield();
  }
}

// ---------------------------------------------------------------------------
// Android native implementation
// ---------------------------------------------------------------------------

class AndroidScreenTimeService implements ScreenTimeService {
  isProduction = true;

  private get native(): NativeScreenTimeAndroid {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const mod = require('../../modules/screen-time-android').default;
    if (!mod) throw new Error('ScreenTimeAndroid native module not available');
    return mod;
  }

  async getPermissions(): Promise<ScreenTimePermissions> {
    const [usageStatus, accessStatus] = await Promise.all([
      this.native.getUsageAccessStatus(),
      this.native.getAccessibilityStatus(),
    ]);
    return {
      iosFamilyControls: 'unavailable',
      androidUsageAccess: usageStatus,
      androidAccessibility: accessStatus,
      notifications: 'not-determined',
    };
  }

  async requestPermission(
    key: 'iosFamilyControls' | 'androidUsageAccess' | 'androidAccessibility' | 'notifications',
  ): Promise<'granted' | 'denied' | 'unavailable'> {
    if (key === 'androidUsageAccess') return this.native.requestUsageAccess();
    if (key === 'androidAccessibility') return this.native.requestAccessibility();
    if (key === 'iosFamilyControls') return 'unavailable';
    return 'not-determined' as any;
  }

  async getTodayUsage(): Promise<AppUsage[]> {
    const raw = await this.native.getTodayUsage();
    return raw.map((r) => ({
      bundleId: r.bundleId,
      displayName: r.displayName,
      minutesToday: r.minutesToday,
      category: (r.category as AppUsage['category']) ?? 'other',
    }));
  }

  async startShield(config: ShieldConfig): Promise<{ ok: boolean; reason?: string }> {
    return this.native.startShield(
      config.blockedBundleIds,
      config.mode,
      config.endsAt ?? 0,
    );
  }

  async stopShield(): Promise<{ ok: boolean }> {
    return this.native.stopShield();
  }
}

// ---------------------------------------------------------------------------
// Mock fallback (Expo Go / CI / unit tests)
// ---------------------------------------------------------------------------

const mockUsage: AppUsage[] = [
  { bundleId: 'com.zhiliaoapp.musically', displayName: 'TikTok',    minutesToday: 74, category: 'video' },
  { bundleId: 'com.burbn.instagram',      displayName: 'Instagram', minutesToday: 52, category: 'social' },
  { bundleId: 'com.atebits.Tweetie2',     displayName: 'X',         minutesToday: 18, category: 'social' },
  { bundleId: 'com.google.ios.youtube',   displayName: 'YouTube',   minutesToday: 41, category: 'video' },
  { bundleId: 'com.apple.MobileSMS',      displayName: 'Messages',  minutesToday: 22, category: 'other' },
  { bundleId: 'com.tinyspeck.chatlyio',   displayName: 'Slack',     minutesToday: 11, category: 'productivity' },
];

class MockScreenTimeService implements ScreenTimeService {
  isProduction = false;
  private perms: ScreenTimePermissions = {
    iosFamilyControls:    Platform.OS === 'ios'     ? 'not-determined' : 'unavailable',
    androidUsageAccess:   Platform.OS === 'android' ? 'denied'         : 'unavailable',
    androidAccessibility: Platform.OS === 'android' ? 'denied'         : 'unavailable',
    notifications: 'not-determined',
  };

  async getPermissions() { return { ...this.perms }; }

  async requestPermission(key: keyof ScreenTimePermissions) {
    if (this.perms[key] === 'unavailable') return 'unavailable';
    const next: 'granted' | 'denied' = Math.random() < 0.9 ? 'granted' : 'denied';
    this.perms = { ...this.perms, [key]: next };
    return next;
  }

  async getTodayUsage() { return mockUsage.map((u) => ({ ...u })); }

  async startShield(_config: ShieldConfig) {
    if (
      this.perms.iosFamilyControls !== 'granted' &&
      this.perms.androidAccessibility !== 'granted'
    ) {
      return { ok: false, reason: 'native-permission-required' };
    }
    return { ok: true };
  }

  async stopShield() { return { ok: true }; }
}

// ---------------------------------------------------------------------------
// Factory — auto-detects whether the native module is available at runtime
// ---------------------------------------------------------------------------

function createService(): ScreenTimeService {
  if (Platform.OS === 'ios') {
    try {
      const mod = require('../../modules/screen-time-ios').default;
      if (mod) return new IOSScreenTimeService();
    } catch {
      // Native module not linked (Expo Go) — fall through to mock.
    }
  }
  if (Platform.OS === 'android') {
    try {
      const mod = require('../../modules/screen-time-android').default;
      if (mod) return new AndroidScreenTimeService();
    } catch {
      // Native module not linked — fall through to mock.
    }
  }
  return new MockScreenTimeService();
}

let instance: ScreenTimeService | null = null;
export function getScreenTimeService(): ScreenTimeService {
  if (!instance) instance = createService();
  return instance;
}

/** Reset the singleton — useful in tests. */
export function _resetScreenTimeService(): void {
  instance = null;
}

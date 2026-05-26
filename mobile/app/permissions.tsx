import React, { useEffect, useState } from 'react';
import { Platform, Text, StyleSheet } from 'react-native';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { LumiSpeechBubble } from '@/components/LumiSpeechBubble';
import { PermissionCard, PermissionStatus } from '@/components/PermissionCard';
import { getScreenTimeService, ScreenTimePermissions } from '@/services/screenTimeService';
import { palette, type } from '@/theme';

const service = getScreenTimeService();

export default function Permissions() {
  const [perms, setPerms] = useState<ScreenTimePermissions | null>(null);

  useEffect(() => {
    service.getPermissions().then(setPerms);
  }, []);

  const request = async (key: keyof ScreenTimePermissions) => {
    await service.requestPermission(key as any);
    setPerms(await service.getPermissions());
  };

  if (!perms) return null;

  const toStatus = (s: string): PermissionStatus => {
    if (s === 'granted') return 'granted';
    if (s === 'denied') return 'denied';
    if (s === 'unavailable') return 'unavailable';
    return 'not-requested';
  };

  return (
    <ScreenScaffold tone="cream">
      <Text style={styles.title}>Permissions</Text>
      <LumiSpeechBubble
        mood="calm"
        caption="LUMI"
        message="Latch only asks for what it needs to coach you. Each permission is opt-in and reversible."
      />

      <PermissionCard
        title="Notifications"
        platform="cross"
        description="Lumi's nudges, focus reminders, and credit milestones."
        why="Without notifications, Latch can only coach when you open the app."
        status={toStatus(perms.notifications)}
        onRequest={() => request('notifications')}
      />

      {Platform.OS === 'ios' ? (
        <PermissionCard
          title="Screen Time (Family Controls)"
          platform="ios"
          description="Lets Latch see which apps you use and shield them during focus windows."
          why="Apple requires this entitlement for any blocking or per-app limits. Data stays on-device — Latch never uploads your raw usage."
          status={toStatus(perms.iosFamilyControls)}
          onRequest={() => request('iosFamilyControls')}
        />
      ) : (
        <PermissionCard
          title="Usage access"
          platform="android"
          description="Reads how long you've spent in each app today."
          why="Android requires this special permission to compute time spent per app. We never read screen contents."
          status={toStatus(perms.androidUsageAccess)}
          onRequest={() => request('androidUsageAccess')}
        />
      )}

      {Platform.OS === 'android' ? (
        <PermissionCard
          title="Accessibility service"
          platform="android"
          description="Powers app blocking and Friction prompts during your focus windows."
          why="Android has no public blocking API. The Accessibility Service only watches the foreground app name to know when to interrupt — no input or screen content is captured."
          status={toStatus(perms.androidAccessibility)}
          onRequest={() => request('androidAccessibility')}
        />
      ) : null}

      <Text style={styles.fineprint}>
        You can revoke any permission at any time from your device settings. Latch will keep working in degraded mode (insights without blocking).
      </Text>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: palette.textPrimary },
  fineprint: { ...type.bodySm, color: palette.textMuted, lineHeight: 20 },
});

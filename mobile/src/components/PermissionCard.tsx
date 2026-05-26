import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { palette, type, spacing, radius, shadows } from '@/theme';

export type PermissionStatus = 'not-requested' | 'granted' | 'denied' | 'unavailable';

export interface PermissionCardProps {
  title: string;
  platform: 'ios' | 'android' | 'cross';
  description: string;
  why: string;
  status: PermissionStatus;
  onRequest?: () => void;
}

const statusMeta: Record<PermissionStatus, { label: string; color: string }> = {
  'not-requested': { label: 'Not granted', color: palette.yellow },
  granted: { label: 'Granted', color: palette.lime },
  denied: { label: 'Denied', color: palette.coral },
  unavailable: { label: 'Unavailable on device', color: palette.textMuted },
};

const platformLabel: Record<PermissionCardProps['platform'], string> = {
  ios: 'iOS',
  android: 'Android',
  cross: 'iOS & Android',
};

export function PermissionCard({ title, platform, description, why, status, onRequest }: PermissionCardProps) {
  const meta = statusMeta[status];
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <Text style={styles.platform}>{platformLabel[platform]}</Text>
        <View style={[styles.statusPill, { backgroundColor: meta.color }]}>
          <Text style={styles.statusText}>{meta.label}</Text>
        </View>
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.description}>{description}</Text>
      <View style={styles.whyBox}>
        <Text style={styles.whyLabel}>Why Latch needs this</Text>
        <Text style={styles.why}>{why}</Text>
      </View>
      {onRequest && status !== 'unavailable' ? (
        <Pressable
          onPress={onRequest}
          style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}
        >
          <Text style={styles.buttonText}>
            {status === 'granted' ? 'Re-check' : 'Allow access'}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.creamSoft,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    ...shadows.card,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  platform: { ...type.caption, color: palette.purple },
  statusPill: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  statusText: { ...type.caption, color: palette.ink },
  title: { ...type.h2, color: palette.textPrimary, marginTop: spacing.md },
  description: { ...type.body, color: palette.textMuted, marginTop: spacing.xs, lineHeight: 22 },
  whyBox: {
    marginTop: spacing.lg,
    backgroundColor: palette.creamWarm,
    borderRadius: radius.lg,
    padding: spacing.md,
  },
  whyLabel: { ...type.caption, color: palette.purple },
  why: { ...type.bodySm, color: palette.textPrimary, marginTop: spacing.xs, lineHeight: 20 },
  button: {
    marginTop: spacing.lg,
    backgroundColor: palette.night,
    borderRadius: radius.lg,
    paddingVertical: spacing.md,
    alignItems: 'center',
  },
  buttonText: { ...type.bodyLg, color: palette.textInverse, fontWeight: '700' },
});

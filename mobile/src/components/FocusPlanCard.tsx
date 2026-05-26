import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, type, spacing, radius, shadows } from '@/theme';

export type FocusDifficulty = 'gentle' | 'steady' | 'deep';

export interface FocusPlanCardProps {
  title: string;
  window: string;
  difficulty: FocusDifficulty;
  apps: string[];
  active?: boolean;
  reward?: number;
  onToggle?: () => void;
}

const difficultyMeta: Record<FocusDifficulty, { label: string; color: string }> = {
  gentle: { label: 'Gentle', color: palette.lime },
  steady: { label: 'Steady', color: palette.yellow },
  deep: { label: 'Deep', color: palette.purple },
};

export function FocusPlanCard({ title, window, difficulty, apps, active, reward, onToggle }: FocusPlanCardProps) {
  const meta = difficultyMeta[difficulty];
  return (
    <View style={[styles.card, active && styles.cardActive]}>
      <View style={styles.headerRow}>
        <View style={[styles.badge, { backgroundColor: meta.color }]}>
          <Text style={styles.badgeText}>{meta.label}</Text>
        </View>
        {reward ? (
          <Text style={styles.reward}>+{reward} credits</Text>
        ) : null}
      </View>
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.window}>{window}</Text>
      <View style={styles.appsRow}>
        {apps.slice(0, 4).map((a) => (
          <View key={a} style={styles.appChip}>
            <Text style={styles.appChipText}>{a}</Text>
          </View>
        ))}
        {apps.length > 4 ? <Text style={styles.more}>+{apps.length - 4}</Text> : null}
      </View>
      {onToggle ? (
        <Pressable onPress={onToggle} style={({ pressed }) => [styles.button, pressed && { opacity: 0.85 }]}>
          <LinearGradient
            colors={active ? [palette.nightSoft, palette.night] : [palette.purple, palette.purpleDeep]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.buttonInner}
          >
            <Text style={styles.buttonText}>{active ? 'Stop focus' : 'Start focus'}</Text>
          </LinearGradient>
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
  cardActive: { borderColor: palette.purple },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  badge: { paddingHorizontal: spacing.md, paddingVertical: 4, borderRadius: radius.pill },
  badgeText: { ...type.caption, color: palette.ink },
  reward: { ...type.bodySm, color: palette.purple, fontWeight: '700' },
  title: { ...type.h2, color: palette.textPrimary, marginTop: spacing.md },
  window: { ...type.body, color: palette.textMuted, marginTop: spacing.xs },
  appsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs, marginTop: spacing.md },
  appChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: 4,
    backgroundColor: palette.creamWarm,
    borderRadius: radius.pill,
  },
  appChipText: { ...type.bodySm, color: palette.textPrimary, fontWeight: '600' },
  more: { ...type.bodySm, color: palette.textMuted, alignSelf: 'center' },
  button: { marginTop: spacing.lg, borderRadius: radius.lg, overflow: 'hidden' },
  buttonInner: { paddingVertical: spacing.md, alignItems: 'center' },
  buttonText: { ...type.bodyLg, color: palette.textInverse, fontWeight: '700' },
});

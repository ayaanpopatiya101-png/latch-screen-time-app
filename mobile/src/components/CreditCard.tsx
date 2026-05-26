import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, type, spacing, radius, shadows } from '@/theme';

export interface CreditCardProps {
  credits: number;
  earnedToday?: number;
  spentToday?: number;
}

export function CreditCard({ credits, earnedToday = 0, spentToday = 0 }: CreditCardProps) {
  return (
    <LinearGradient
      colors={[palette.yellow, palette.yellowDeep]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.card}
    >
      <Text style={styles.label}>Latch credits</Text>
      <Text style={styles.value}>{credits.toLocaleString()}</Text>
      <View style={styles.row}>
        <Text style={styles.meta}>+{earnedToday} today</Text>
        <Text style={styles.meta}>-{spentToday} spent</Text>
      </View>
    </LinearGradient>
  );
}

export function CreditPill({ credits }: { credits: number }) {
  return (
    <View style={styles.pill}>
      <View style={styles.pillDot} />
      <Text style={styles.pillText}>{credits} credits</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.cardLifted,
  },
  label: { ...type.caption, color: palette.ink },
  value: { ...type.display, color: palette.ink, marginTop: spacing.xs, fontSize: 44 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: spacing.md },
  meta: { ...type.bodySm, color: palette.ink, fontWeight: '700' },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    backgroundColor: palette.yellow,
    borderRadius: radius.pill,
    alignSelf: 'flex-start',
  },
  pillDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: palette.ink, marginRight: spacing.xs },
  pillText: { ...type.bodySm, color: palette.ink, fontWeight: '700' },
});

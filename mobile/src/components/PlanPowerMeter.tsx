import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, type, spacing, radius, shadows } from '@/theme';

export interface PlanPowerMeterProps {
  power: number;
  persona?: string;
  risk?: 'low' | 'medium' | 'high';
}

export function PlanPowerMeter({ power, persona, risk }: PlanPowerMeterProps) {
  const clamped = Math.max(0, Math.min(100, Math.round(power)));
  const riskColor = risk === 'high' ? palette.coral : risk === 'medium' ? palette.yellow : palette.lime;
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Text style={styles.label}>Plan power</Text>
        {persona ? <Text style={styles.persona}>{persona}</Text> : null}
      </View>
      <Text style={styles.value}>{clamped}<Text style={styles.unit}> / 100</Text></Text>
      <View style={styles.track}>
        <LinearGradient
          colors={[palette.lime, palette.limeDeep]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.fill, { width: `${clamped}%` }]}
        />
      </View>
      {risk ? (
        <View style={styles.riskRow}>
          <View style={[styles.riskDot, { backgroundColor: riskColor }]} />
          <Text style={styles.riskText}>{risk[0].toUpperCase() + risk.slice(1)} risk window</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: palette.nightSoft,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.cardLifted,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  label: { ...type.caption, color: palette.textMutedDark },
  persona: { ...type.bodySm, color: palette.lime, fontWeight: '700' },
  value: { ...type.display, color: palette.textInverse, marginTop: spacing.sm },
  unit: { ...type.h2, color: palette.textMutedDark, fontWeight: '600' },
  track: {
    marginTop: spacing.lg,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: palette.dividerDark,
    overflow: 'hidden',
  },
  fill: { height: '100%', borderRadius: radius.pill },
  riskRow: { flexDirection: 'row', alignItems: 'center', marginTop: spacing.md, gap: spacing.sm },
  riskDot: { width: 10, height: 10, borderRadius: 5 },
  riskText: { ...type.bodySm, color: palette.textMutedDark },
});

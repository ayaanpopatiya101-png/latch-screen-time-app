import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router } from 'expo-router';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { LumiSpeechBubble } from '@/components/LumiSpeechBubble';
import { PlanPowerMeter } from '@/components/PlanPowerMeter';
import { CreditCard } from '@/components/CreditCard';
import { useStore } from '@/state/store';
import { palette, type, spacing, radius, shadows } from '@/theme';

export default function Dashboard() {
  const { user, planScore, derived, focusPlans, shieldActive, shieldMode } = useStore();
  if (!planScore) return null;

  const nextFocus = focusPlans.find((p) => !p.active) ?? focusPlans[0];

  return (
    <ScreenScaffold tone="cream">
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.hi}>Hi, {user?.displayName ?? 'friend'}</Text>
          <Text style={styles.subtitle}>Your day, designed with Lumi.</Text>
        </View>
      </View>

      <LumiSpeechBubble
        mood={planScore.risk === 'high' ? 'concerned' : 'focused'}
        caption="LUMI"
        message={
          shieldActive
            ? `Shield is on (${shieldMode}). Stay with the plan — I'll let you know when the window ends.`
            : `Next up: ${nextFocus.title} at ${nextFocus.window}. Worth ${nextFocus.reward} credits.`
        }
        align="row"
      />

      <PlanPowerMeter power={planScore.power} persona={planScore.persona} risk={planScore.risk} />

      <View style={styles.row}>
        <View style={{ flex: 1 }}>
          <CreditCard credits={derived.balance} earnedToday={derived.earnedToday} spentToday={derived.spentToday} />
        </View>
      </View>

      <View style={styles.energyCard}>
        <Text style={styles.cardLabel}>Brain energy</Text>
        <Text style={styles.energyValue}>{planScore.brainEnergy}<Text style={styles.energyUnit}>%</Text></Text>
        <Text style={styles.energyHint}>How much focus capacity Lumi estimates you have left today.</Text>
      </View>

      <Pressable onPress={() => router.push('/(tabs)/focus')} style={({ pressed }) => [styles.nextAction, pressed && { opacity: 0.88 }]}>
        <Text style={styles.nextLabel}>NEXT ACTION</Text>
        <Text style={styles.nextTitle}>Start {nextFocus.title}</Text>
        <Text style={styles.nextWindow}>{nextFocus.window}</Text>
      </Pressable>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  hi: { ...type.h1, color: palette.textPrimary },
  subtitle: { ...type.body, color: palette.textMuted, marginTop: 2 },
  row: { flexDirection: 'row', gap: spacing.md },
  energyCard: {
    backgroundColor: palette.creamSoft,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    ...shadows.card,
  },
  cardLabel: { ...type.caption, color: palette.purple },
  energyValue: { ...type.display, color: palette.textPrimary, marginTop: spacing.xs },
  energyUnit: { ...type.h2, color: palette.textMuted },
  energyHint: { ...type.bodySm, color: palette.textMuted, marginTop: spacing.xs, lineHeight: 19 },
  nextAction: {
    backgroundColor: palette.night,
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.cardLifted,
  },
  nextLabel: { ...type.caption, color: palette.lime },
  nextTitle: { ...type.h2, color: palette.textInverse, marginTop: spacing.xs },
  nextWindow: { ...type.body, color: palette.textMutedDark, marginTop: 2 },
});

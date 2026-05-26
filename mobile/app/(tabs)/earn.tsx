import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { LumiSpeechBubble } from '@/components/LumiSpeechBubble';
import { CreditCard } from '@/components/CreditCard';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useStore } from '@/state/store';
import { EARN_RULES, SPEND_RULES } from '@/engines/credits';
import { palette, type, spacing, radius, shadows } from '@/theme';

export default function Earn() {
  const { credits, derived, earn, spend } = useStore();

  return (
    <ScreenScaffold tone="cream">
      <Text style={styles.title}>Earn & spend</Text>
      <LumiSpeechBubble mood="cheering" caption="LUMI" message="Every healthy choice earns credits. Spend them to unlock blocked apps — your call." />
      <CreditCard credits={derived.balance} earnedToday={derived.earnedToday} spentToday={derived.spentToday} />

      <View style={styles.card}>
        <Text style={styles.section}>Ways to earn</Text>
        {Object.entries(EARN_RULES).map(([k, v]) => (
          <View key={k} style={styles.row}>
            <Text style={styles.rowText}>{v.reason}</Text>
            <Text style={styles.rowDelta}>+{v.delta}</Text>
          </View>
        ))}
        <PrimaryButton label="Log a daily check-in" variant="lime" onPress={() => earn(EARN_RULES.dailyCheckin.delta, EARN_RULES.dailyCheckin.reason)} style={{ marginTop: spacing.md }} />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Ways to spend</Text>
        {Object.entries(SPEND_RULES).map(([k, v]) => (
          <View key={k} style={styles.row}>
            <Text style={styles.rowText}>{v.reason}</Text>
            <Text style={[styles.rowDelta, { color: palette.coral }]}>{v.delta}</Text>
          </View>
        ))}
        <PrimaryButton
          label="Unlock blocked app 15 min"
          variant="night"
          onPress={() => spend(SPEND_RULES.unlockApp15.delta, SPEND_RULES.unlockApp15.reason)}
          style={{ marginTop: spacing.md }}
        />
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Recent activity</Text>
        {credits.slice(-8).reverse().map((e) => (
          <View key={e.id} style={styles.row}>
            <Text style={styles.rowText}>{e.reason}</Text>
            <Text style={[styles.rowDelta, { color: e.delta >= 0 ? palette.success : palette.coral }]}>
              {e.delta >= 0 ? '+' : ''}{e.delta}
            </Text>
          </View>
        ))}
        {credits.length === 0 ? <Text style={styles.empty}>No activity yet — start a focus or check in.</Text> : null}
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: palette.textPrimary },
  card: {
    backgroundColor: palette.creamSoft,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    ...shadows.card,
  },
  section: { ...type.h3, color: palette.textPrimary, marginBottom: spacing.sm },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.xs },
  rowText: { ...type.body, color: palette.textPrimary, flexShrink: 1, paddingRight: spacing.md },
  rowDelta: { ...type.body, color: palette.success, fontWeight: '700' },
  empty: { ...type.bodySm, color: palette.textMuted, fontStyle: 'italic' },
});

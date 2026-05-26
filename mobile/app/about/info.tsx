import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { LumiSpeechBubble } from '@/components/LumiSpeechBubble';
import Constants from 'expo-constants';
import { palette, type, spacing, radius } from '@/theme';

export default function About() {
  const version = Constants.expoConfig?.version ?? '0.1.0';
  return (
    <ScreenScaffold tone="cream">
      <Text style={styles.title}>About Latch</Text>
      <LumiSpeechBubble
        mood="calm"
        caption="LUMI"
        message="Latch is a screen-time coach. I help you spend less time scrolling and more time on what matters to you."
      />
      <View style={styles.card}>
        <Row label="Version" value={version} />
        <Row label="Build" value={Constants.expoConfig?.runtimeVersion?.toString() ?? 'preview'} />
      </View>
    </ScreenScaffold>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: palette.textPrimary },
  card: { backgroundColor: palette.creamSoft, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: palette.divider },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  label: { ...type.body, color: palette.textMuted },
  value: { ...type.body, color: palette.textPrimary, fontWeight: '700' },
});

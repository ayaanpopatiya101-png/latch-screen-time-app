import React from 'react';
import { Text, StyleSheet, View } from 'react-native';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { palette, type, spacing, radius } from '@/theme';

export default function Privacy() {
  return (
    <ScreenScaffold tone="cream">
      <Text style={styles.title}>Privacy policy (summary)</Text>
      <Text style={styles.body}>
        Latch is built on-device first. The full policy is in docs/privacy-policy.md in the public repo.
      </Text>

      <Section title="What we collect">
        <Bullet>Account info you give us: name and email.</Bullet>
        <Bullet>Usage signals from Apple's Screen Time / Android's UsageStats — processed on your device.</Bullet>
        <Bullet>Mood and check-in answers you choose to log.</Bullet>
        <Bullet>Diagnostic crash reports (optional, can be disabled).</Bullet>
      </Section>

      <Section title="What we never do">
        <Bullet>We do not sell or rent your data.</Bullet>
        <Bullet>We do not target ads using your screen-time or mood data.</Bullet>
        <Bullet>We do not read the contents of any screen you view.</Bullet>
        <Bullet>We do not transmit raw per-app usage off your device. Only aggregate scores are synced if you opt in.</Bullet>
      </Section>

      <Section title="Retention & deletion">
        <Bullet>You can delete your account and all derived data from Settings → Account → Delete.</Bullet>
        <Bullet>Account deletion runs within 30 days end-to-end (immediate locally, queued for backup purge).</Bullet>
      </Section>
    </ScreenScaffold>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}
function Bullet({ children }: { children: React.ReactNode }) {
  return <Text style={styles.bullet}>• {children}</Text>;
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: palette.textPrimary },
  body: { ...type.body, color: palette.textMuted, lineHeight: 22 },
  section: { backgroundColor: palette.creamSoft, borderRadius: radius.xl, padding: spacing.xl, borderWidth: 1, borderColor: palette.divider, gap: spacing.xs },
  sectionTitle: { ...type.h3, color: palette.textPrimary, marginBottom: spacing.xs },
  bullet: { ...type.body, color: palette.textPrimary, lineHeight: 22 },
});

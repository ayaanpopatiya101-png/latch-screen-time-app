import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { router, Link } from 'expo-router';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { LumiSpeechBubble } from '@/components/LumiSpeechBubble';
import { SecondaryButton } from '@/components/PrimaryButton';
import { useStore } from '@/state/store';
import { palette, type, spacing, radius, shadows } from '@/theme';

export default function Settings() {
  const { user, signOut, planScore } = useStore();

  const handleSignOut = async () => {
    await signOut();
    router.replace('/login');
  };

  return (
    <ScreenScaffold tone="cream">
      <Text style={styles.title}>More</Text>
      <LumiSpeechBubble
        mood="calm"
        caption="LUMI"
        message="Manage your account, permissions and how Latch protects your data."
      />

      <View style={styles.card}>
        <Text style={styles.section}>Account</Text>
        <View style={styles.row}><Text style={styles.label}>Name</Text><Text style={styles.value}>{user?.displayName}</Text></View>
        <View style={styles.row}><Text style={styles.label}>Email</Text><Text style={styles.value}>{user?.email}</Text></View>
        {planScore ? (
          <>
            <View style={styles.row}><Text style={styles.label}>Persona</Text><Text style={styles.value}>{planScore.persona}</Text></View>
            <View style={styles.row}><Text style={styles.label}>Plan power</Text><Text style={styles.value}>{planScore.power}/100</Text></View>
          </>
        ) : null}
      </View>

      <View style={styles.card}>
        <Text style={styles.section}>Privacy & permissions</Text>
        <LinkRow label="Permissions" href="/permissions" />
        <LinkRow label="Privacy policy" href="/about/privacy" />
        <LinkRow label="About Latch" href="/about/info" />
      </View>

      <SecondaryButton label="Sign out" onPress={handleSignOut} />
    </ScreenScaffold>
  );
}

function LinkRow({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href as any} asChild>
      <Pressable style={({ pressed }) => [styles.linkRow, pressed && { opacity: 0.7 }]}>
        <Text style={styles.linkLabel}>{label}</Text>
        <Text style={styles.linkArrow}>→</Text>
      </Pressable>
    </Link>
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
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: spacing.sm },
  label: { ...type.body, color: palette.textMuted },
  value: { ...type.body, color: palette.textPrimary, fontWeight: '700' },
  linkRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: spacing.md, borderTopWidth: 1, borderTopColor: palette.divider },
  linkLabel: { ...type.bodyLg, color: palette.textPrimary, fontWeight: '600' },
  linkArrow: { ...type.h3, color: palette.purple },
});

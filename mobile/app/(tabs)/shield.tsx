import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { LumiSpeechBubble } from '@/components/LumiSpeechBubble';
import { ShieldModeCard, ShieldMode } from '@/components/ShieldModeCard';
import { PrimaryButton, SecondaryButton } from '@/components/PrimaryButton';
import { useStore } from '@/state/store';
import { palette, type, spacing, radius } from '@/theme';
import { Link } from 'expo-router';

const MODES: ShieldMode[] = ['gentle', 'friction', 'deep-lock'];

export default function Shield() {
  const { shieldMode, setShieldMode, shieldActive, setShieldActive } = useStore();
  return (
    <ScreenScaffold tone="cream">
      <Text style={styles.title}>Shield</Text>
      <LumiSpeechBubble
        mood={shieldActive ? 'cheering' : 'calm'}
        caption="LUMI"
        message={shieldActive ? "Shield is on. I'll hold the line for you." : 'Pick how strong I should hold the line when you reach a limit.'}
      />
      {MODES.map((m) => (
        <ShieldModeCard
          key={m}
          mode={m}
          selected={shieldMode === m}
          requiresNative={m === 'deep-lock'}
          onSelect={() => setShieldMode(m)}
        />
      ))}
      <View style={styles.actions}>
        {shieldActive ? (
          <SecondaryButton label="Turn Shield off" onPress={() => setShieldActive(false)} />
        ) : (
          <PrimaryButton label="Activate Shield" variant="purple" onPress={() => setShieldActive(true)} />
        )}
      </View>
      <View style={styles.permsLink}>
        <Link href="/permissions" style={styles.linkText}>Manage Shield permissions →</Link>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: palette.textPrimary },
  actions: { marginTop: spacing.md },
  permsLink: {
    marginTop: spacing.sm,
    backgroundColor: palette.creamSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  linkText: { ...type.bodyLg, color: palette.purple, fontWeight: '700' },
});

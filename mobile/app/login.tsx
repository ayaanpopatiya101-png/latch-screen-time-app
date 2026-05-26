import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { router } from 'expo-router';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { LumiSpeechBubble } from '@/components/LumiSpeechBubble';
import { PrimaryButton } from '@/components/PrimaryButton';
import { useStore } from '@/state/store';
import { palette, type, spacing, radius, shadows } from '@/theme';

export default function Login() {
  const { signUp } = useStore();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const submit = async () => {
    if (!email.includes('@') || name.trim().length < 2) return;
    setSubmitting(true);
    try {
      await signUp(email, name);
      router.replace('/interview');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScreenScaffold tone="cream">
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <LumiSpeechBubble
          mood="cheering"
          caption="LUMI"
          message="Hi — I'm Lumi. I'll lead your screen-time mission. Tell me where to send your daily nudges and what to call you."
          align="column"
        />

        <View style={styles.card}>
          <Text style={styles.label}>What should Lumi call you?</Text>
          <TextInput
            placeholder="First name"
            value={name}
            onChangeText={setName}
            autoCapitalize="words"
            autoCorrect={false}
            style={styles.input}
            placeholderTextColor={palette.textMuted}
          />

          <Text style={[styles.label, { marginTop: spacing.lg }]}>Email</Text>
          <TextInput
            placeholder="you@example.com"
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="email-address"
            style={styles.input}
            placeholderTextColor={palette.textMuted}
          />

          <PrimaryButton
            label={submitting ? 'Starting…' : 'Begin your mission'}
            onPress={submit}
            disabled={submitting || !email.includes('@') || name.trim().length < 2}
            variant="purple"
            style={{ marginTop: spacing.xl }}
          />
          <Text style={styles.legal}>
            By continuing you agree to Latch's privacy approach: on-device first, no ad targeting with screen-time or mood data.
          </Text>
        </View>
      </KeyboardAvoidingView>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: spacing.lg,
    backgroundColor: palette.creamSoft,
    borderRadius: radius.xl,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: palette.divider,
    ...shadows.card,
  },
  label: { ...type.caption, color: palette.purple },
  input: {
    ...type.bodyLg,
    color: palette.textPrimary,
    backgroundColor: palette.cream,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    marginTop: spacing.xs,
    borderWidth: 1,
    borderColor: palette.divider,
  },
  legal: { ...type.bodySm, color: palette.textMuted, marginTop: spacing.lg, lineHeight: 19 },
});

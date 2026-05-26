import React from 'react';
import { Pressable, Text, StyleSheet, ViewStyle, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, type, spacing, radius } from '@/theme';

export interface PrimaryButtonProps {
  label: string;
  onPress?: () => void;
  variant?: 'lime' | 'purple' | 'night' | 'cream';
  disabled?: boolean;
  style?: ViewStyle;
}

const variants: Record<NonNullable<PrimaryButtonProps['variant']>, { colors: readonly [string, string]; text: string }> = {
  lime: { colors: [palette.lime, palette.limeDeep], text: palette.ink },
  purple: { colors: [palette.purple, palette.purpleDeep], text: palette.textInverse },
  night: { colors: [palette.nightSoft, palette.night], text: palette.textInverse },
  cream: { colors: [palette.creamSoft, palette.creamWarm], text: palette.textPrimary },
};

export function PrimaryButton({ label, onPress, variant = 'purple', disabled, style }: PrimaryButtonProps) {
  const v = variants[variant];
  return (
    <Pressable onPress={onPress} disabled={disabled} style={({ pressed }) => [{ opacity: pressed || disabled ? 0.8 : 1 }, style]}>
      <LinearGradient colors={v.colors} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.btn}>
        <Text style={[styles.label, { color: v.text }]}>{label}</Text>
      </LinearGradient>
    </Pressable>
  );
}

export function SecondaryButton({ label, onPress, style }: { label: string; onPress?: () => void; style?: ViewStyle }) {
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [styles.secondary, pressed && { opacity: 0.85 }, style]}>
      <View>
        <Text style={styles.secondaryLabel}>{label}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    paddingVertical: spacing.md + 2,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    alignItems: 'center',
  },
  label: { ...type.bodyLg, fontWeight: '800' },
  secondary: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.lg,
    borderWidth: 1.5,
    borderColor: palette.divider,
    alignItems: 'center',
    backgroundColor: palette.creamSoft,
  },
  secondaryLabel: { ...type.bodyLg, color: palette.textPrimary, fontWeight: '700' },
});

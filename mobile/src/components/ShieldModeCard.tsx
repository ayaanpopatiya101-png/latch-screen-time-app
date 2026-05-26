import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette, type, spacing, radius, shadows } from '@/theme';

export type ShieldMode = 'gentle' | 'friction' | 'deep-lock';

export interface ShieldModeCardProps {
  mode: ShieldMode;
  selected?: boolean;
  requiresNative?: boolean;
  onSelect?: () => void;
}

const meta: Record<ShieldMode, { title: string; description: string; gradient: readonly [string, string]; tone: 'dark' | 'light' }> = {
  gentle: {
    title: 'Gentle',
    description: 'Lumi sends a calm nudge when you cross your set limit. You can dismiss freely.',
    gradient: [palette.lime, palette.limeDeep],
    tone: 'light',
  },
  friction: {
    title: 'Friction',
    description: 'A 20-second breath and reflection step before the app opens. Most users stop here.',
    gradient: [palette.yellow, palette.yellowDeep],
    tone: 'light',
  },
  'deep-lock': {
    title: 'Deep Lock',
    description: 'The app is blocked at the OS level until your scheduled window ends. Hardest to bypass.',
    gradient: [palette.purple, palette.purpleDeep],
    tone: 'dark',
  },
};

export function ShieldModeCard({ mode, selected, requiresNative, onSelect }: ShieldModeCardProps) {
  const m = meta[mode];
  const textColor = m.tone === 'dark' ? palette.textInverse : palette.ink;
  return (
    <Pressable onPress={onSelect} style={({ pressed }) => [pressed && { opacity: 0.92 }]}>
      <LinearGradient colors={m.gradient} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[styles.card, selected && styles.selected]}>
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: textColor }]}>{m.title}</Text>
          {selected ? <Text style={[styles.selectedTag, { color: textColor }]}>SELECTED</Text> : null}
        </View>
        <Text style={[styles.description, { color: textColor }]}>{m.description}</Text>
        {requiresNative ? (
          <View style={styles.warnBox}>
            <Text style={styles.warnText}>
              Requires Apple Family Controls entitlement on iOS and Accessibility / Usage Access on Android. In this prototype the lock is simulated.
            </Text>
          </View>
        ) : null}
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    ...shadows.card,
  },
  selected: {
    borderWidth: 3,
    borderColor: palette.ink,
  },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  title: { ...type.h2 },
  selectedTag: { ...type.caption, fontWeight: '800' },
  description: { ...type.body, marginTop: spacing.sm, lineHeight: 22 },
  warnBox: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(0,0,0,0.25)',
    borderRadius: radius.md,
    padding: spacing.md,
  },
  warnText: { ...type.bodySm, color: palette.textInverse, lineHeight: 19 },
});

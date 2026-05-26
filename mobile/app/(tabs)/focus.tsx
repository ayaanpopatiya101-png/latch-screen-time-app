import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { LumiSpeechBubble } from '@/components/LumiSpeechBubble';
import { FocusPlanCard } from '@/components/FocusPlanCard';
import { useStore } from '@/state/store';
import { palette, type, spacing } from '@/theme';

export default function Focus() {
  const { focusPlans, toggleFocus, earn } = useStore();
  return (
    <ScreenScaffold tone="cream">
      <Text style={styles.title}>Focus windows</Text>
      <LumiSpeechBubble
        mood="focused"
        caption="LUMI"
        message="Scheduled blocks where I shield your distractions. Complete a window and you earn credits."
      />
      {focusPlans.map((p) => (
        <FocusPlanCard
          key={p.id}
          title={p.title}
          window={p.window}
          difficulty={p.difficulty}
          apps={p.apps}
          reward={p.reward}
          active={p.active}
          onToggle={() => {
            toggleFocus(p.id);
            if (!p.active) earn(p.reward, `Completed focus: ${p.title}`);
          }}
        />
      ))}
      <View style={styles.note}>
        <Text style={styles.noteText}>
          Prototype: focus windows do not yet block at the OS level. In production, "Deep" focus uses iOS Family Controls (Shield) and Android Accessibility blocking.
        </Text>
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  title: { ...type.h1, color: palette.textPrimary },
  note: {
    padding: spacing.lg,
    backgroundColor: palette.creamWarm,
    borderRadius: 14,
  },
  noteText: { ...type.bodySm, color: palette.textMuted, lineHeight: 20 },
});

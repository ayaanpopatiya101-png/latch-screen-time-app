import React, { useMemo, useState } from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ScreenScaffold } from '@/components/ScreenScaffold';
import { LumiSpeechBubble } from '@/components/LumiSpeechBubble';
import { PrimaryButton } from '@/components/PrimaryButton';
import { INTERVIEW_QUESTIONS, suggestNextQuestion, scoreInterview } from '@/engines/interview';
import { useStore } from '@/state/store';
import { palette, type, spacing, radius, shadows } from '@/theme';

export default function Interview() {
  const { recordAnswer, finalizeInterview, interviewAnswers } = useStore();
  const [asked, setAsked] = useState<string[]>(interviewAnswers.map((a) => a.questionId));
  const [answers, setAnswers] = useState(interviewAnswers);
  const current = useMemo(() => suggestNextQuestion(asked), [asked]);
  const progress = Math.round((asked.length / INTERVIEW_QUESTIONS.length) * 100);

  if (!current) {
    const score = scoreInterview(answers);
    return (
      <ScreenScaffold tone="cream">
        <LumiSpeechBubble
          mood="happy"
          caption="LUMI"
          message={`Your plan power is ${score.power}. I'd call you a ${score.persona}. ${score.rationale[0] ?? ''}`}
          align="column"
        />
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>What I'll tune for you</Text>
          {score.rationale.map((r, i) => (
            <Text key={i} style={styles.bullet}>• {r}</Text>
          ))}
        </View>
        <PrimaryButton
          label="Build my dashboard"
          variant="lime"
          onPress={() => {
            finalizeInterview(score);
            router.replace('/(tabs)/dashboard');
          }}
        />
      </ScreenScaffold>
    );
  }

  const select = (value: number) => {
    recordAnswer(current.id, value);
    setAnswers((prev) => [...prev.filter((a) => a.questionId !== current.id), { questionId: current.id, value }]);
    setAsked((prev) => [...prev, current.id]);
  };

  return (
    <ScreenScaffold tone="cream">
      <View style={styles.progressRow}>
        <Text style={styles.progressText}>Lumi interview • {asked.length}/{INTERVIEW_QUESTIONS.length}</Text>
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
      </View>
      <LumiSpeechBubble mood="focused" caption="LUMI" message={current.prompt} align="column" />
      <View style={{ gap: spacing.md }}>
        {current.options.map((opt) => (
          <Pressable
            key={opt.label}
            onPress={() => select(opt.value)}
            style={({ pressed }) => [styles.option, pressed && { opacity: 0.88 }]}
          >
            <Text style={styles.optionText}>{opt.label}</Text>
          </Pressable>
        ))}
      </View>
    </ScreenScaffold>
  );
}

const styles = StyleSheet.create({
  progressRow: { gap: spacing.xs },
  progressText: { ...type.caption, color: palette.purple },
  progressTrack: { height: 6, borderRadius: radius.pill, backgroundColor: palette.divider, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: palette.purple },
  option: {
    backgroundColor: palette.creamSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.divider,
    ...shadows.card,
  },
  optionText: { ...type.bodyLg, color: palette.textPrimary, fontWeight: '600' },
  summary: {
    backgroundColor: palette.nightSoft,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.sm,
  },
  summaryLabel: { ...type.caption, color: palette.lime },
  bullet: { ...type.body, color: palette.textInverse, lineHeight: 22 },
});

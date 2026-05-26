import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LumiAvatar, LumiAvatarProps } from './LumiAvatar';
import { palette, type, spacing, radius, shadows } from '@/theme';

export interface LumiSpeechBubbleProps {
  message: string;
  mood?: LumiAvatarProps['mood'];
  caption?: string;
  align?: 'row' | 'column';
  style?: ViewStyle;
}

export function LumiSpeechBubble({ message, mood = 'calm', caption, align = 'row', style }: LumiSpeechBubbleProps) {
  return (
    <View style={[align === 'row' ? styles.row : styles.column, style]}>
      <LumiAvatar size={align === 'row' ? 52 : 72} mood={mood} />
      <View style={[styles.bubble, align === 'row' ? styles.bubbleRow : styles.bubbleColumn]}>
        {caption ? <Text style={styles.caption}>{caption}</Text> : null}
        <Text style={styles.message}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-start' },
  column: { flexDirection: 'column', alignItems: 'flex-start', gap: spacing.md },
  bubble: {
    backgroundColor: palette.creamSoft,
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: palette.divider,
    ...shadows.card,
  },
  bubbleRow: { marginLeft: spacing.md, flexShrink: 1, flex: 1 },
  bubbleColumn: { alignSelf: 'stretch' },
  caption: { ...type.caption, color: palette.purple, marginBottom: spacing.xs },
  message: { ...type.bodyLg, color: palette.textPrimary, lineHeight: 23 },
});

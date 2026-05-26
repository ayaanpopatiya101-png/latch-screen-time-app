import React from 'react';
import { View, ScrollView, StyleSheet, StatusBar, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { palette, spacing } from '@/theme';

export interface ScreenScaffoldProps {
  children: React.ReactNode;
  scroll?: boolean;
  tone?: 'cream' | 'night';
  contentStyle?: ViewStyle;
}

export function ScreenScaffold({ children, scroll = true, tone = 'cream', contentStyle }: ScreenScaffoldProps) {
  const bg = tone === 'night' ? palette.night : palette.cream;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: bg }]} edges={['top', 'left', 'right']}>
      <StatusBar barStyle={tone === 'night' ? 'light-content' : 'dark-content'} />
      {scroll ? (
        <ScrollView
          contentContainerStyle={[styles.content, contentStyle]}
          showsVerticalScrollIndicator={false}
        >
          {children}
        </ScrollView>
      ) : (
        <View style={[styles.content, contentStyle]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.lg,
    paddingBottom: spacing.xxxl,
    gap: spacing.lg,
  },
});

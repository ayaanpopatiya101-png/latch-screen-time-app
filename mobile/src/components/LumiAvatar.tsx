import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { palette } from '@/theme';

type Mood = 'calm' | 'happy' | 'focused' | 'concerned' | 'cheering';

export interface LumiAvatarProps {
  size?: number;
  mood?: Mood;
  style?: ViewStyle;
}

const moodColors: Record<Mood, [string, string]> = {
  calm: [palette.purple, palette.purpleDeep],
  happy: [palette.lime, palette.limeDeep],
  focused: [palette.purple, palette.purpleDeep],
  concerned: [palette.coral, '#D85E4D'],
  cheering: [palette.yellow, palette.yellowDeep],
};

export function LumiAvatar({ size = 56, mood = 'calm', style }: LumiAvatarProps) {
  const colors = moodColors[mood];
  const eye = size * 0.12;
  const eyeOffset = size * 0.18;
  return (
    <View style={[{ width: size, height: size }, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.bubble, { width: size, height: size, borderRadius: size / 2 }]}
      >
        <View style={styles.face}>
          <View style={[styles.eye, { width: eye, height: eye, borderRadius: eye / 2, marginRight: eyeOffset }]} />
          <View style={[styles.eye, { width: eye, height: eye, borderRadius: eye / 2 }]} />
        </View>
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  bubble: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  face: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  eye: {
    backgroundColor: palette.ink,
  },
});

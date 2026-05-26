import React, { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Redirect } from 'expo-router';
import { useStore } from '@/state/store';
import { palette } from '@/theme';

export default function Index() {
  const { hydrated, user, planScore } = useStore();
  useEffect(() => {}, []);
  if (!hydrated) {
    return (
      <View style={{ flex: 1, backgroundColor: palette.cream, alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator color={palette.purple} />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (!planScore) return <Redirect href="/interview" />;
  return <Redirect href="/(tabs)/dashboard" />;
}

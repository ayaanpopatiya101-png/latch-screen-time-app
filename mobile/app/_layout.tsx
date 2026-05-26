import React from 'react';
import { Stack } from 'expo-router';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StoreProvider } from '@/state/store';
import { palette } from '@/theme';

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: palette.cream }}>
      <SafeAreaProvider>
        <StoreProvider>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: palette.cream },
              animation: 'slide_from_right',
            }}
          />
        </StoreProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

import React from 'react';
import { Tabs } from 'expo-router';
import { Text, View, StyleSheet } from 'react-native';
import { palette, type } from '@/theme';

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  return (
    <View style={styles.iconWrap}>
      <View style={[styles.dot, { backgroundColor: focused ? palette.purple : 'transparent' }]} />
      <Text style={[styles.label, { color: focused ? palette.purple : palette.textMuted }]}>{label}</Text>
    </View>
  );
}

export default function TabsLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarShowLabel: false,
        tabBarStyle: {
          backgroundColor: palette.creamSoft,
          borderTopColor: palette.divider,
          height: 76,
          paddingTop: 8,
        },
      }}
    >
      <Tabs.Screen name="dashboard" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} /> }} />
      <Tabs.Screen name="focus" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Focus" focused={focused} /> }} />
      <Tabs.Screen name="shield" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Shield" focused={focused} /> }} />
      <Tabs.Screen name="earn" options={{ tabBarIcon: ({ focused }) => <TabIcon label="Earn" focused={focused} /> }} />
      <Tabs.Screen name="settings" options={{ tabBarIcon: ({ focused }) => <TabIcon label="More" focused={focused} /> }} />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  iconWrap: { alignItems: 'center', justifyContent: 'center', gap: 4, paddingTop: 6 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  label: { ...type.caption, fontSize: 11 },
});

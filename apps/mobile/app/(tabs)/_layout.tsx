import { Redirect, Tabs } from 'expo-router';
import React from 'react';
import { ActivityIndicator, View } from 'react-native';

import { HapticTab } from '@/components/haptic-tab';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Colors } from '@/constants/theme';
import { useColorScheme } from '@/hooks/use-color-scheme';
import { useSessionStore } from '@/src/stores/session-store';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const accessToken = useSessionStore((state) => state.accessToken);
  const hasHydrated = useSessionStore((state) => state.hasHydrated);

  if (!hasHydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f5f7fb',
        }}>
        <ActivityIndicator size="large" color="#173b67" />
      </View>
    );
  }

  if (!accessToken) {
    return <Redirect href="/login" />;
  }

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarButton: HapticTab,
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Início',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="house.fill" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="explore"
        options={{
          title: 'Mais',
          tabBarIcon: ({ color }) => (
            <IconSymbol size={28} name="ellipsis.circle.fill" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

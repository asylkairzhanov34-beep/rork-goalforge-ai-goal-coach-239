import React from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Stack } from 'expo-router';
import { NotificationSettings } from '@/components/NotificationSettings';
import { GradientBackground } from '@/components/GradientBackground';

export default function NotificationSettingsScreen() {
  return (
    <GradientBackground>
      <Stack.Screen 
        options={{ 
          title: 'Notifications',
          headerStyle: {
            backgroundColor: 'transparent',
          },
          headerTintColor: '#FFFFFF',
          headerTitleStyle: {
            fontWeight: '600',
          },
        }} 
      />
      <SafeAreaView style={styles.container} edges={['bottom']}>
        <NotificationSettings />
      </SafeAreaView>
    </GradientBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
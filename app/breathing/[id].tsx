import React from 'react';
import { View, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, Stack } from 'expo-router';
import { theme } from '@/constants/theme';
import { BREATHING_TECHNIQUES } from '@/constants/breathing';
import { BreathingTimer } from '@/components/BreathingTimer';

export default function BreathingTechniqueScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams();
  
  const technique = BREATHING_TECHNIQUES.find(t => t.id === id);
  
  if (!technique) {
    return <View style={styles.container} />;
  }

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: technique.name,
          headerStyle: {
            backgroundColor: theme.colors.background,
          },
          headerTintColor: theme.colors.text,
          headerTitleStyle: {
            fontWeight: theme.fontWeight.semibold as any,
          },
          headerShown: false, // We handle the header in BreathingTimer component
        }} 
      />
      <View style={[styles.container, { paddingBottom: insets.bottom + 100 }]}>
        <BreathingTimer technique={technique} />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
});
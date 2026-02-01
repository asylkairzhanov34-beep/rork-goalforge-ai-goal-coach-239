import React from 'react';
import { View, StyleSheet, ViewStyle } from 'react-native';
import { theme } from '@/constants/theme';

interface GradientBackgroundProps {
  children: React.ReactNode;
  style?: ViewStyle;
  variant?: 'default' | 'dark';
}

export function GradientBackground({ 
  children, 
  style,
  variant = 'default'
}: GradientBackgroundProps) {
  const backgroundColor = variant === 'dark' ? theme.colors.surfaceDark : theme.colors.background;

  return (
    <View style={[styles.container, { backgroundColor }, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});